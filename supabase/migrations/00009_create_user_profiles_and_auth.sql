/*
# Create User Profiles and Authentication System

## 1. Plain English Explanation
This migration sets up a proper authentication system using Supabase Auth.
It creates a profiles table to store user information and automatically syncs
new users from auth.users to profiles. The first user to register becomes an admin.

## 2. New Tables

### profiles
- `id` (uuid, primary key, references auth.users): User ID from Supabase Auth
- `username` (text, unique): Username for login
- `email` (text, unique): User email
- `role` (user_role enum): User role (user or admin)
- `created_at` (timestamptz): Account creation timestamp
- `updated_at` (timestamptz): Last update timestamp

## 3. Security Changes
- Enable RLS on profiles table
- Create admin helper function to check user role
- Policies:
  1. Admins have full access to all profiles
  2. Users can view their own profile
  3. Users can update their own profile (except role field)
- Public view for shareable profile info

## 4. Trigger
- Auto-sync confirmed users from auth.users to profiles
- First user gets admin role, subsequent users get user role
- Only triggers when confirmed_at changes from NULL to NOT NULL

## 5. Notes
- Uses username + password authentication with @miaoda.com domain
- Email verification is disabled for username-based auth
- Only profiles.id references auth.users(id)
*/

-- Create user role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text UNIQUE,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create admin helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- Create policies
CREATE POLICY "Admins have full access" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) 
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- Create public view
CREATE VIEW public_profiles AS
SELECT
  id,
  username
FROM profiles;

-- Create trigger function to sync new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  INSERT INTO profiles (id, username, email, role)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END
  );
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Create updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
