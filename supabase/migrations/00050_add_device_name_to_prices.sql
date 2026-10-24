-- Add device_name field to device_prices table for custom device templates
ALTER TABLE device_prices 
ADD COLUMN IF NOT EXISTS device_name text;

-- Add comment
COMMENT ON COLUMN device_prices.device_name IS 'Custom device name for templates';