-- Add installation_note column to devices table
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS installation_note TEXT;

COMMENT ON COLUMN devices.installation_note IS 'Installation notes and remarks for the device';

-- Add installation_note column to quotations.devices_data (JSONB field)
-- Note: This is handled at application level since devices_data is JSONB