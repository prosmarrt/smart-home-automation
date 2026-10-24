/*
# Add intercom_type to device_prices table

## Purpose
Support pricing for different intercom components (doorbell, indoor station).

## Changes
1. Add intercom_type column to device_prices table
2. Drop old unique constraint
3. Create new unique constraint including intercom_type

## Notes
- intercom_type is nullable (only used for intercom devices)
- Unique constraint now includes (category, protocol, gang, intercom_type)
*/

-- Add intercom_type column
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS intercom_type text;

-- Drop old unique constraint
ALTER TABLE device_prices DROP CONSTRAINT IF EXISTS device_prices_category_protocol_gang_key;

-- Create new unique constraint including intercom_type
ALTER TABLE device_prices ADD CONSTRAINT device_prices_unique_config 
  UNIQUE(category, protocol, gang, intercom_type);