-- Function to auto-create missing custom_device prices
CREATE OR REPLACE FUNCTION handle_custom_device_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on custom_device creations
  IF NEW.category = 'custom_device' THEN
    -- Check if a price entry already exists for this exact combination
    IF NOT EXISTS (
      SELECT 1 FROM device_prices 
      WHERE category = 'custom_device' 
        AND device_name = NEW.device_name 
        AND protocol = NEW.protocol
    ) THEN
      -- Create a pending price entry
      INSERT INTO device_prices (
        category, 
        protocol, 
        device_name,
        description,
        unit_price, 
        cost_price, 
        pending_approval
      ) VALUES (
        'custom_device',
        NEW.protocol,
        NEW.device_name,
        NEW.custom_description,
        NEW.unit_price,
        0,
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire on new devices being added to a quotation
DROP TRIGGER IF EXISTS tr_custom_device_price_sync ON devices;
CREATE TRIGGER tr_custom_device_price_sync
AFTER INSERT ON devices
FOR EACH ROW
EXECUTE FUNCTION handle_custom_device_price();
