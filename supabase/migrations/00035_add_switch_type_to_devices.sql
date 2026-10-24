/*
# Add switch_type Column to Devices Table

## 1. Plain English Explanation
This migration adds a switch_type column to the devices table to store whether
a network switch is POE (Power over Ethernet) or Standard type.

## 2. Changes
- Add `switch_type` (text, nullable): Network switch type (poe, standard)

## 3. Notes
- Only relevant for network_switch category devices
- Nullable to maintain backward compatibility
*/

-- Add switch_type column to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS switch_type text;

-- Add index for switch_type queries
CREATE INDEX IF NOT EXISTS idx_devices_switch_type ON devices(switch_type) WHERE switch_type IS NOT NULL;