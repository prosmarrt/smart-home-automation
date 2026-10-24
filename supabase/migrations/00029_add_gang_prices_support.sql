/*
# Add Gang-Specific Pricing Support

## 1. Overview
This migration adds support for gang-specific pricing where each gang option can have its own price.
For example, a 1-Gang switch might cost 100 EGP while a 4-Gang switch costs 250 EGP.

## 2. Schema Changes

### device_templates table
- Add `gang_prices` (jsonb) - Stores prices for each gang option
  * Structure: { "1": 100, "2": 150, "3": 200, "4": 250 }
  * Null for devices that don't support gangs
  * Falls back to default_unit_price if not specified

- Add `port_prices` (jsonb) - Stores prices for each port option
  * Structure: { "4": 200, "8": 350, "16": 600, "24": 900 }
  * Null for devices that don't support ports
  * Falls back to default_unit_price if not specified

- Add `capacity_prices` (jsonb) - Stores prices for each capacity option
  * Structure: { "1tb": 500, "2tb": 800, "4tb": 1200 }
  * Null for devices that don't support capacity
  * Falls back to default_unit_price if not specified

## 3. Backward Compatibility
- Existing devices continue to use default_unit_price
- New devices can optionally use gang_prices/port_prices/capacity_prices
- If gang_prices is null, fall back to default_unit_price
- Quotations will check gang_prices first, then fall back to default_unit_price

## 4. Usage Examples

### Example 1: Touch Switch with Gang Prices
```
name: "KNX Touch Switch"
gang_options: ['1', '2', '3', '4']
gang_prices: { "1": 100, "2": 150, "3": 200, "4": 250 }
default_unit_price: 100 (fallback)
```

### Example 2: Network Switch with Port Prices
```
name: "Managed Network Switch"
port_options: ['8', '16', '24']
port_prices: { "8": 350, "16": 600, "24": 900 }
default_unit_price: 350 (fallback)
```

### Example 3: Simple Device (No Options)
```
name: "Motion Sensor"
gang_prices: null
port_prices: null
capacity_prices: null
default_unit_price: 75 (used directly)
```
*/

-- Add gang_prices column to device_templates
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS gang_prices jsonb;

-- Add port_prices column to device_templates
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS port_prices jsonb;

-- Add capacity_prices column to device_templates
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS capacity_prices jsonb;

-- Add comments for documentation
COMMENT ON COLUMN device_templates.gang_prices IS 'JSONB object mapping gang options to prices, e.g., {"1": 100, "2": 150, "3": 200, "4": 250}';
COMMENT ON COLUMN device_templates.port_prices IS 'JSONB object mapping port options to prices, e.g., {"4": 200, "8": 350, "16": 600, "24": 900}';
COMMENT ON COLUMN device_templates.capacity_prices IS 'JSONB object mapping capacity options to prices, e.g., {"1tb": 500, "2tb": 800, "4tb": 1200}';

-- Create helper function to get price for a specific gang option
CREATE OR REPLACE FUNCTION get_device_price(
  template_id uuid,
  gang_option text DEFAULT NULL,
  port_option text DEFAULT NULL,
  capacity_option text DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  template_record RECORD;
  price numeric;
BEGIN
  SELECT * INTO template_record FROM device_templates WHERE id = template_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check gang_prices first
  IF gang_option IS NOT NULL AND template_record.gang_prices IS NOT NULL THEN
    price := (template_record.gang_prices->>gang_option)::numeric;
    IF price IS NOT NULL THEN
      RETURN price;
    END IF;
  END IF;
  
  -- Check port_prices
  IF port_option IS NOT NULL AND template_record.port_prices IS NOT NULL THEN
    price := (template_record.port_prices->>port_option)::numeric;
    IF price IS NOT NULL THEN
      RETURN price;
    END IF;
  END IF;
  
  -- Check capacity_prices
  IF capacity_option IS NOT NULL AND template_record.capacity_prices IS NOT NULL THEN
    price := (template_record.capacity_prices->>capacity_option)::numeric;
    IF price IS NOT NULL THEN
      RETURN price;
    END IF;
  END IF;
  
  -- Fall back to default_unit_price
  RETURN template_record.default_unit_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;