/*
# Create client_info table

## Overview
This migration creates a table to store client information for smart home projects,
including client name, address, phone number, and project code.

## Tables Created

### client_info
Stores client and project information:
- `id` (uuid, primary key): Unique identifier for the client record
- `client_name` (text, not null): Full name of the client
- `address` (text): Client's address
- `phone_number` (text): Client's phone number
- `project_code` (text, unique, not null): Auto-generated project code (client initials + date)
- `created_at` (timestamptz): Timestamp when the record was created
- `updated_at` (timestamptz): Timestamp when the record was last updated

## Security
- No RLS enabled - this is a single-user application for project management
- All users can read and modify client information

## Notes
- Only one client record should exist per project
- Project code format: ClientInitials-YYYYMMDD (e.g., JD-20251211)
*/

CREATE TABLE IF NOT EXISTS client_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  address text,
  phone_number text,
  project_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_client_info_updated_at
  BEFORE UPDATE ON client_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
