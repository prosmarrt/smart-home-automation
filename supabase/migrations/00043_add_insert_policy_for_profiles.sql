/*
# Add INSERT Policy for Profiles Table

## Problem
No INSERT policy exists on profiles table. Even though trigger uses SECURITY DEFINER,
we need explicit INSERT policies for proper operation.

## Solution
Add policies to allow profile creation via trigger and Edge Functions.
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow profile creation via trigger" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Add policy to allow inserts for authenticated users (for trigger)
CREATE POLICY "Allow profile creation via trigger"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy for service role (for Edge Functions)
CREATE POLICY "Service role can insert profiles"
ON profiles
FOR INSERT
TO service_role
WITH CHECK (true);