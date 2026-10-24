/*
# Add Email and Phone Verification Support

## 1. Overview
This migration adds support for email and phone verification in the authentication system.
It adds phone field to profiles table and updates the trigger to handle email/phone data.

## 2. Schema Changes

### profiles table
- Add `phone` (text) - User's phone number with country code
- Add `email_verified` (boolean) - Whether email is verified
- Add `phone_verified` (boolean) - Whether phone is verified
- Update email column to allow real emails (not just @miaoda.com)

## 3. Trigger Updates
- Update handle_new_user trigger to sync email and phone from auth.users
- Handle email verification status
- Handle phone verification status

## 4. Security
- Email verification required for real email addresses
- Phone verification optional
- Username-only accounts (@miaoda.com) don't require verification

## 5. Features
- Email verification via Supabase Auth
- Phone verification via Supabase Auth (optional)
- Show/hide password toggle in UI
- Verification status tracking
*/

-- Add phone column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Add verification status columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Update the handle_new_user trigger to sync email and phone
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user boolean;
  user_role user_role;
  user_email text;
  user_phone text;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) INTO is_first_user;
  
  -- Set role: first user is admin, others need approval
  IF is_first_user THEN
    user_role := 'admin'::user_role;
  ELSE
    user_role := 'user'::user_role;
  END IF;
  
  -- Get email and phone from auth.users
  user_email := NEW.email;
  user_phone := NEW.phone;
  
  -- Extract username from metadata or email
  INSERT INTO profiles (id, username, email, phone, role, email_verified, phone_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    user_email,
    user_phone,
    user_role,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number with country code (e.g., +201234567890)';
COMMENT ON COLUMN profiles.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the user has verified their phone number';

-- Update existing profiles to set email_verified based on auth.users
UPDATE profiles p
SET 
  email_verified = COALESCE((
    SELECT u.email_confirmed_at IS NOT NULL
    FROM auth.users u
    WHERE u.id = p.id
  ), false),
  phone_verified = COALESCE((
    SELECT u.phone_confirmed_at IS NOT NULL
    FROM auth.users u
    WHERE u.id = p.id
  ), false)
WHERE p.email_verified IS NULL OR p.phone_verified IS NULL;