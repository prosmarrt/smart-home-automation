/*
# Fix Trigger Function - Add Missing Approved Field

## Problem
The handle_new_user() trigger function is missing the 'approved' field in the INSERT statement.
This causes "Database error saving new user" because approved is NOT NULL.

## Solution
1. Update trigger function to include approved field
2. Set approved=true for first user (admin), false for others
3. Drop duplicate old trigger (on_auth_user_confirmed)
*/

-- Drop the old duplicate trigger
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Update the trigger function to include approved field
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user boolean;
  user_role user_role;
  user_email text;
  user_phone text;
  user_approved boolean;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) INTO is_first_user;
  
  -- Set role: first user is admin, others are regular users
  IF is_first_user THEN
    user_role := 'admin'::user_role;
    user_approved := true;  -- First user is auto-approved
  ELSE
    user_role := 'user'::user_role;
    user_approved := false;  -- Other users need approval
  END IF;
  
  -- Get email and phone from auth.users
  user_email := NEW.email;
  user_phone := NEW.phone;
  
  -- Insert or update profile with ALL required fields including approved
  INSERT INTO profiles (
    id, 
    username, 
    email, 
    phone, 
    role, 
    email_verified, 
    phone_verified,
    approved,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    user_email,
    user_phone,
    user_role,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
    user_approved,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    phone_verified = COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure only the correct trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION handle_new_user() IS 
  'Automatically creates or updates profile when user is created or email/phone is confirmed. Includes approved field: true for first user (admin), false for others.';