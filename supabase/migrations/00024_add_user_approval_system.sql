/*
# Add User Approval System

## 1. Plain English Explanation
This migration adds an approval system for new users. Only approved users can log in.
Admins can approve or reject users through the admin panel. The first user (admin) is
automatically approved.

## 2. Schema Changes

### profiles table
- Add `approved` (boolean, default false): Whether the user is approved to access the system
- Add `approved_by` (uuid, nullable, references profiles.id): Admin who approved the user
- Add `approved_at` (timestamptz, nullable): When the user was approved

## 3. Security Changes
- No RLS changes needed (existing policies cover this)
- Update trigger to auto-approve first user (admin)

## 4. Notes
- First user is auto-approved since they become admin
- All subsequent users need admin approval
- Admins can approve/reject users through the admin panel
*/

-- Add approval fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Update the trigger function to auto-approve first user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  is_first_user boolean;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  is_first_user := user_count = 0;
  
  INSERT INTO profiles (id, username, email, role, approved)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email,
    CASE WHEN is_first_user THEN 'admin'::user_role ELSE 'user'::user_role END,
    is_first_user  -- First user is auto-approved
  );
  RETURN NEW;
END;
$$;

-- Create function to approve user (only admins can call this)
CREATE OR REPLACE FUNCTION approve_user(
  target_user_id uuid,
  approve boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;
  
  -- Update user approval status
  UPDATE profiles
  SET 
    approved = approve,
    approved_by = CASE WHEN approve THEN auth.uid() ELSE NULL END,
    approved_at = CASE WHEN approve THEN now() ELSE NULL END
  WHERE id = target_user_id;
END;
$$;