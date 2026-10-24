-- Add description and notes fields to device_prices table
ALTER TABLE device_prices 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add comments
COMMENT ON COLUMN device_prices.description IS 'Device description/specifications';
COMMENT ON COLUMN device_prices.notes IS 'Additional notes about the device';