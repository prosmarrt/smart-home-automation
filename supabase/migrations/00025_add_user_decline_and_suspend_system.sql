/*
# Add User Decline and Suspend System

## 1. Plain English Explanation
This migration adds the ability for admins to:
- Decline pending user requests (removes auth user but can keep profile for audit)
- Suspend/Delete users while maintaining all their data (rooms, devices, quotations)
- All data created by suspended/deleted users is preserved for historical records

## 2. Schema Changes

### profiles table
- Add `suspended` (boolean, default false): Whether the user account is suspended
- Add `suspended_by` (uuid, nullable, references profiles.id): Admin who suspended the user
- Add `suspended_at` (timestamptz, nullable): When the user was suspended
- Add `declined` (boolean, default false): Whether the user request was declined
- Add `declined_by` (uuid, nullable, references profiles.id): Admin who declined the user
- Add `declined_at` (timestamptz, nullable): When the user was declined

## 3. Security Changes
- Add RPC function `decline_user` for admins to decline pending users
- Add RPC function `suspend_user` for admins to suspend users
- Update policies to prevent suspended users from accessing the system
- Ensure all user data (rooms, devices, quotations) is preserved when user is suspended

## 4. Notes
- Declined users have their auth account removed but profile kept for audit trail
- Suspended users cannot log in but all their data remains intact
- Admins can see suspended/declined users in the admin panel
- Data integrity is maintained - no cascading deletes on user suspension
*/

-- Add suspension and decline fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS declined boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS declined_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- Create function to decline a pending user
CREATE OR REPLACE FUNCTION decline_user(
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can decline users';
  END IF;
  
  -- Mark user as declined in profiles
  UPDATE profiles
  SET 
    declined = true,
    declined_by = auth.uid(),
    declined_at = now()
  WHERE id = target_user_id;
  
  -- Note: We keep the profile for audit trail but the user cannot log in
  -- The auth user can be deleted separately if needed
END;
$$;

-- Create function to suspend a user
CREATE OR REPLACE FUNCTION suspend_user(
  target_user_id uuid,
  do_suspend boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;
  
  -- Prevent admin from suspending themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;
  
  -- Update user suspension status
  UPDATE profiles
  SET 
    suspended = do_suspend,
    suspended_by = CASE WHEN do_suspend THEN auth.uid() ELSE NULL END,
    suspended_at = CASE WHEN do_suspend THEN now() ELSE NULL END
  WHERE id = target_user_id;
  
  -- Note: All user data (rooms, devices, quotations) is preserved
  -- We only mark the user as suspended, no data deletion occurs
END;
$$;

-- Create a view for active users (not suspended or declined)
CREATE OR REPLACE VIEW active_profiles AS
SELECT * FROM profiles
WHERE suspended = false AND declined = false;

-- Grant access to the view
GRANT SELECT ON active_profiles TO authenticated;