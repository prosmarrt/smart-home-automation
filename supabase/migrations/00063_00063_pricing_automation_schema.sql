-- Add external integration columns to device_prices
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE device_prices ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone;

-- Create an index to speed up sync operations by external_id
CREATE INDEX IF NOT EXISTS idx_device_prices_external_id ON device_prices(external_id);
