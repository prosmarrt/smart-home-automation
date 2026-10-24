/*
# Make Quotations Accessible to All Users

## 1. Plain English Explanation
This migration updates the quotations table RLS policies to allow all authenticated users
to view all quotations, not just their own. This enables shared access to quotations
across the organization while maintaining user-specific creation and modification rights.

## 2. Security Changes
- Drop the restrictive "Users can view own quotations" policy
- Create a new policy allowing all authenticated users to view all quotations
- Keep creation, update, and delete policies user-specific for data integrity
- Admin policy remains for full access

## 3. Notes
- All authenticated users can now view all quotations
- Users can still only create, update, and delete their own quotations
- Admins retain full access to all quotations
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own quotations" ON quotations;

-- Create new policy allowing all authenticated users to view all quotations
CREATE POLICY "All users can view all quotations" ON quotations
  FOR SELECT TO authenticated USING (true);
