/*
# Add Commissioning and Installation Table

## Overview
Creates a table to store commissioning and installation service fees and details.

## Tables Created

### `commissioning_installation`
- `id` (uuid, primary key) - Unique identifier
- `commissioning_fee` (numeric, default 0) - Fee for commissioning services
- `installation_fee` (numeric, default 0) - Fee for installation services
- `commissioning_notes` (text) - Notes about commissioning work
- `installation_notes` (text) - Notes about installation work
- `estimated_days` (integer, default 1) - Estimated days for completion
- `technicians_required` (integer, default 1) - Number of technicians needed
- `created_at` (timestamptz) - Record creation timestamp
- `updated_at` (timestamptz) - Record update timestamp

## Security
- No RLS enabled - public access for quotation management
*/

CREATE TABLE IF NOT EXISTS commissioning_installation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioning_fee numeric DEFAULT 0 NOT NULL,
  installation_fee numeric DEFAULT 0 NOT NULL,
  commissioning_notes text,
  installation_notes text,
  estimated_days integer DEFAULT 1 NOT NULL,
  technicians_required integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_commissioning_installation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commissioning_installation_updated_at
  BEFORE UPDATE ON commissioning_installation
  FOR EACH ROW
  EXECUTE FUNCTION update_commissioning_installation_updated_at();
