/*
# Add Network Switch Pricing Fields

## 1. Plain English Explanation
This migration extends the device_prices table to support pricing variants for network switches
based on their type (POE or Standard) and port count (4, 8, 16, or 24 ports).

## 2. Table Changes
- `device_prices` table:
  - Add `switch_type` (text, nullable): Network switch type (poe, standard)
  - Add `switch_ports` (text, nullable): Port count (4, 8, 16, 24)
  - Update UNIQUE constraint to include new switch fields

## 3. Security
- No RLS changes - inherits existing policies from previous migrations

## 4. Notes
- These fields are nullable to maintain backward compatibility
- Only relevant for network_switch category
- The unique constraint ensures no duplicate price entries for the same configuration
*/

-- Add network switch variant columns
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS switch_type text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS switch_ports text;

-- Drop old unique constraint
ALTER TABLE device_prices DROP CONSTRAINT IF EXISTS device_prices_unique_config;

-- Create new unique constraint that includes all variant fields including network switch
ALTER TABLE device_prices ADD CONSTRAINT device_prices_unique_config 
  UNIQUE NULLS NOT DISTINCT (
    category, 
    protocol, 
    gang, 
    camera_resolution, 
    camera_type, 
    nvr_channels, 
    hdd_capacity, 
    intercom_type,
    switch_type,
    switch_ports
  );
