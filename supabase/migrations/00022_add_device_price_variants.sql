/*
# Add Device Price Variants for Camera, NVR, and HDD

## 1. Plain English Explanation
This migration extends the device_prices table to support pricing variants for cameras (by resolution),
NVRs (by channel count), and HDDs (by capacity). This allows administrators to set different prices
for different configurations of these devices.

## 2. Table Changes
- `device_prices` table:
  - Add `camera_resolution` (text, nullable): Camera resolution (2mp, 3mp, 4mp, 6mp)
  - Add `camera_type` (text, nullable): Camera type (indoor, outdoor)
  - Add `nvr_channels` (text, nullable): NVR channel count (4ch, 8ch, 16ch)
  - Add `hdd_capacity` (text, nullable): HDD capacity (1tb, 2tb, 4tb)
  - Add `intercom_type` (text, nullable): Intercom type (doorbell, indoor_station)
  - Update UNIQUE constraint to include new variant fields

## 3. Security
- No RLS changes - inherits existing policies from previous migrations

## 4. Notes
- These fields are nullable to maintain backward compatibility
- Only relevant fields should be populated for each device category
- The unique constraint ensures no duplicate price entries for the same configuration
*/

-- Add new variant columns (intercom_type already exists)
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS camera_resolution text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS camera_type text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS nvr_channels text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS hdd_capacity text;

-- Remove duplicate entries before creating unique constraint
-- Keep only the most recent entry for each unique combination
DELETE FROM device_prices a USING device_prices b
WHERE a.id < b.id 
  AND a.category = b.category 
  AND (a.protocol = b.protocol OR (a.protocol IS NULL AND b.protocol IS NULL))
  AND (a.gang = b.gang OR (a.gang IS NULL AND b.gang IS NULL))
  AND (a.intercom_type = b.intercom_type OR (a.intercom_type IS NULL AND b.intercom_type IS NULL));

-- Drop old unique constraints if they exist
ALTER TABLE device_prices DROP CONSTRAINT IF EXISTS device_prices_category_protocol_gang_key;
ALTER TABLE device_prices DROP CONSTRAINT IF EXISTS device_prices_unique_config;

-- Create new unique constraint that includes all variant fields
ALTER TABLE device_prices ADD CONSTRAINT device_prices_unique_config 
  UNIQUE NULLS NOT DISTINCT (category, protocol, gang, camera_resolution, camera_type, nvr_channels, hdd_capacity, intercom_type);
