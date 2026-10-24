/*
# Migrate Existing Tables to Use Auth User ID (Corrected)

## 1. Plain English Explanation
This migration updates the existing rooms and devices tables to use proper Supabase Auth
user IDs (uuid) instead of text-based anonymous IDs. It also adds user_id to client_info
and commissioning_installation tables, and adds RLS policies to ensure data security.

## 2. Changes

### Schema Updates
- Change user_id from text to uuid in rooms and devices
- Add user_id column to client_info and commissioning_installation
- Add foreign key references to profiles(id)
- Enable RLS on all tables
- Add appropriate policies for data access

### Security Policies
All tables follow the same pattern:
1. Admins can view all data
2. Users can view their own data
3. Users can create their own data
4. Users can update their own data
5. Users can delete their own data

## 3. Notes
- Existing data with text user_ids will be cleared (fresh start with auth)
- All tables now properly reference profiles(id)
- Data is properly isolated by authenticated user
*/

-- Drop existing data (since we're migrating from anonymous to authenticated)
TRUNCATE TABLE devices CASCADE;
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE client_info CASCADE;
TRUNCATE TABLE commissioning_installation CASCADE;

-- Update rooms table
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_user_id_fkey;
ALTER TABLE rooms ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE rooms ADD CONSTRAINT rooms_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update devices table
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_user_id_fkey;
ALTER TABLE devices ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE devices ADD CONSTRAINT devices_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add user_id to client_info table
ALTER TABLE client_info ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE client_info ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE client_info ADD CONSTRAINT client_info_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add user_id to commissioning_installation table
ALTER TABLE commissioning_installation ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE commissioning_installation ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE commissioning_installation ADD CONSTRAINT commissioning_installation_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissioning_installation ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_prices ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Admins can view all rooms" ON rooms
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own rooms" ON rooms
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rooms" ON rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rooms" ON rooms
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rooms" ON rooms
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Devices policies
CREATE POLICY "Admins can view all devices" ON devices
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own devices" ON devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own devices" ON devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON devices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON devices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Client info policies
CREATE POLICY "Admins can view all client info" ON client_info
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own client info" ON client_info
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own client info" ON client_info
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client info" ON client_info
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client info" ON client_info
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Commissioning installation policies
CREATE POLICY "Admins can view all commissioning" ON commissioning_installation
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own commissioning" ON commissioning_installation
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commissioning" ON commissioning_installation
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commissioning" ON commissioning_installation
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commissioning" ON commissioning_installation
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Device prices policies (shared across all users, read-only for users, full access for admins)
CREATE POLICY "Everyone can view device prices" ON device_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage device prices" ON device_prices
  FOR ALL TO authenticated USING (is_admin(auth.uid()));
