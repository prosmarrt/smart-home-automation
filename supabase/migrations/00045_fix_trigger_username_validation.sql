/*
# Fix Trigger Username Validation

## Problem
The trigger requires username in metadata, but existing users don't have it.
The validation is too strict and causes "Database error creating user".

## Solution
Make username validation more flexible:
1. Try to get username from metadata
2. If not found, extract from email
3. Only fail if both are missing/invalid
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user boolean;
  user_role user_role;
  user_email text;
  user_phone text;
  user_approved boolean;
  user_username text;
  error_message text;
BEGIN
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
    
    -- Validate email
    IF user_email IS NULL OR user_email = '' THEN
      RAISE EXCEPTION 'Email is required for user creation';
    END IF;
    
    -- Extract username: try metadata first, then email
    user_username := NEW.raw_user_meta_data->>'username';
    
    IF user_username IS NULL OR user_username = '' THEN
      -- Fall back to extracting from email
      user_username := split_part(user_email, '@', 1);
    END IF;
    
    -- Final validation: username must not be empty
    IF user_username IS NULL OR user_username = '' THEN
      RAISE EXCEPTION 'Username could not be determined from metadata or email';
    END IF;
    
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
      user_username,
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
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Get the specific constraint that was violated
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      RAISE EXCEPTION 'Profile creation failed - duplicate data: %', error_message;
    WHEN foreign_key_violation THEN
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      RAISE EXCEPTION 'Profile creation failed - foreign key error: %', error_message;
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      RAISE EXCEPTION 'Profile creation failed: %', error_message;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 
  'Automatically creates or updates profile when user is created or email/phone is confirmed. Username extracted from metadata or email. Includes comprehensive error handling.';