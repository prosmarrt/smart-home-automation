/*
# Create device_prices table

## Purpose
Store default pricing for different device categories, protocols, and configurations.
This allows administrators to pre-configure prices that auto-populate when adding devices.

## Tables Created
- `device_prices`: Stores pricing information for device categories

### device_prices columns:
- `id` (uuid, primary key): Unique identifier
- `category` (text, not null): Device category (mini_switch, touch_switch, etc.)
- `protocol` (text, nullable): Protocol type (zigbee, matter, wifi) - null for devices without protocol
- `gang` (text, nullable): Gang configuration (1, 2, 3, 4) - only for switches
- `unit_price` (numeric, not null, default 0): Price per unit in EGP
- `created_at` (timestamptz, default now()): Creation timestamp
- `updated_at` (timestamptz, default now()): Last update timestamp

## Security
- Public table (no RLS) - accessible to all users for reading and updating prices
- Unique constraint on (category, protocol, gang) to prevent duplicate price entries

## Notes
- Prices are in EGP currency
- Protocol and gang fields are nullable to support devices that don't use these attributes
- Updated_at is automatically updated via trigger
*/

CREATE TABLE IF NOT EXISTS device_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  protocol text,
  gang text,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, protocol, gang)
);

CREATE OR REPLACE FUNCTION update_device_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_prices_updated_at
  BEFORE UPDATE ON device_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_device_prices_updated_at();