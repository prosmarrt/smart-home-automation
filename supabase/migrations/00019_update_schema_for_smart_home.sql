/*
# Update Smart Home Schema

## Plain English Explanation
This migration updates the existing schema to support the smart home automation requirements.
It adds missing columns and ensures compatibility with the new application structure.

## Changes Made
1. Add device_type column to devices table if it doesn't exist
2. Add config jsonb column for flexible device configuration
3. Add nvr_channels column for NVR channel configuration (4ch, 8ch, 16ch)

## Notes
- Uses IF NOT EXISTS to avoid errors if columns already exist
- Maintains backward compatibility with existing data
*/

-- Add device_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE devices ADD COLUMN device_type text;
  END IF;
END $$;

-- Add config column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'config'
  ) THEN
    ALTER TABLE devices ADD COLUMN config jsonb;
  END IF;
END $$;

-- Add nvr_channels column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'nvr_channels'
  ) THEN
    ALTER TABLE devices ADD COLUMN nvr_channels text;
  END IF;
END $$;