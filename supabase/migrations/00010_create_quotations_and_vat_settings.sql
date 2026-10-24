/*
# Create Quotations and VAT Settings Tables

## 1. Plain English Explanation
This migration creates tables to store complete quotations with all their data,
and a global VAT settings table. Quotations store snapshots of all devices, rooms,
client information, and pricing at the time of creation. VAT settings allow users
to set a global VAT percentage that can be applied to all prices.

## 2. New Tables

### quotations
- `id` (uuid, primary key): Unique quotation identifier
- `user_id` (uuid, references profiles): Owner of the quotation
- `project_code` (text, not null): Project code for the quotation
- `client_name` (text): Client name
- `client_address` (text): Client address
- `client_phone` (text): Client phone number
- `global_protocol` (text): Global protocol setting
- `vat_percentage` (numeric): VAT percentage at time of creation
- `rooms_data` (jsonb): Snapshot of all rooms
- `devices_data` (jsonb): Snapshot of all devices
- `commissioning_price` (numeric): Commissioning price
- `installation_price` (numeric): Installation price
- `total_amount` (numeric): Total quotation amount
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

### vat_settings
- `id` (uuid, primary key): Setting identifier
- `user_id` (uuid, references profiles, unique): Owner of the setting
- `vat_percentage` (numeric, default 0): VAT percentage (0-100)
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

## 3. Security Changes
- Enable RLS on both tables
- Quotations policies:
  1. Admins can view all quotations
  2. Users can view their own quotations
  3. Users can create their own quotations
  4. Users can update their own quotations
  5. Users can delete their own quotations
- VAT settings policies:
  1. Users can view their own settings
  2. Users can insert their own settings
  3. Users can update their own settings

## 4. Notes
- Quotations store complete snapshots to preserve historical data
- VAT settings are per-user for flexibility
- All monetary values use numeric type for precision
*/

-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_code text NOT NULL,
  client_name text,
  client_address text,
  client_phone text,
  global_protocol text,
  vat_percentage numeric(5,2) DEFAULT 0,
  rooms_data jsonb DEFAULT '[]'::jsonb,
  devices_data jsonb DEFAULT '[]'::jsonb,
  commissioning_price numeric(10,2) DEFAULT 0,
  installation_price numeric(10,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create VAT settings table
CREATE TABLE IF NOT EXISTS vat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vat_percentage numeric(5,2) DEFAULT 0 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_settings ENABLE ROW LEVEL SECURITY;

-- Quotations policies
CREATE POLICY "Admins can view all quotations" ON quotations
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own quotations" ON quotations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quotations" ON quotations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotations" ON quotations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotations" ON quotations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VAT settings policies
CREATE POLICY "Users can view own vat settings" ON vat_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vat settings" ON vat_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vat settings" ON vat_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_code ON quotations(project_code);
CREATE INDEX IF NOT EXISTS idx_vat_settings_user_id ON vat_settings(user_id);

-- Create updated_at triggers
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vat_settings_updated_at
  BEFORE UPDATE ON vat_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
