-- Migration: Add smart_lock and wifi_camera device categories, and brand/model fields

-- Add brand and model fields to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_brand ON devices(brand);
CREATE INDEX IF NOT EXISTS idx_devices_category ON devices(category);

-- Add brand and model to device_prices table if it exists
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS model text;

-- Comments for documentation
COMMENT ON COLUMN devices.brand IS 'Brand/manufacturer name for the device (e.g., Ezvis, Tapo, Tenda for wifi cameras)';
COMMENT ON COLUMN devices.model IS 'Model number or name for the device (e.g., for smart locks)';
COMMENT ON COLUMN devices.device_name IS 'Custom user-defined name for the device';
