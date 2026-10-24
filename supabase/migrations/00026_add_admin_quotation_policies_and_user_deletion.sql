/*
# Add Admin Full Access to Quotations and User Deletion Function

## 1. Plain English Explanation
This migration adds comprehensive admin permissions for quotations management and 
implements a secure user deletion function. Admins can now fully manage all quotations
(create, update, delete) and permanently delete user accounts when necessary.

## 2. Security Changes

### Quotations Policies
- Add policy for admins to create quotations for any user
- Add policy for admins to update any quotation
- Add policy for admins to delete any quotation

### User Deletion
- Create RPC function `delete_user_account` that:
  - Only allows admins to delete users
  - Permanently removes user from auth.users (cascades to profiles and all related data)
  - Cannot delete the calling admin's own account (safety check)

## 3. Notes
- Admins now have full CRUD access to all quotations
- User deletion is permanent and cascades to all related data
- Admins cannot delete themselves to prevent lockout
- Only admins can call the delete_user_account function
*/

-- Add admin policies for full quotations management
CREATE POLICY "Admins can create quotations for any user" ON quotations
  FOR INSERT TO authenticated 
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update any quotation" ON quotations
  FOR UPDATE TO authenticated 
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete any quotation" ON quotations
  FOR DELETE TO authenticated 
  USING (is_admin(auth.uid()));

-- Create function to delete user account (admin only)
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete user accounts';
  END IF;

  -- Prevent admin from deleting themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete from auth.users (will cascade to profiles and all related data)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
