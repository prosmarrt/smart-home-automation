/*
# Add Custom Device Templates and KNX Protocol

## 1. Overview
This migration adds support for custom device templates that users can create and reuse across quotations.
It also adds KNX (wired) protocol support and includes common KNX device types.

## 2. New Tables

### device_templates
Stores reusable device templates that can be selected in quotations.
- `id` (uuid, primary key)
- `name` (text, not null) - Display name of the device
- `category` (device_category, not null) - Device category
- `description` (text) - Optional description
- `default_protocol` (protocol) - Suggested protocol for this device
- `supports_gangs` (boolean) - Whether device supports gang configuration
- `supports_ports` (boolean) - Whether device supports port configuration
- `supports_capacity` (boolean) - Whether device supports capacity configuration
- `gang_options` (text[]) - Available gang options (e.g., ['1', '2', '3', '4'])
- `port_options` (text[]) - Available port options (e.g., ['4', '8', '16', '24'])
- `capacity_options` (text[]) - Available capacity options (e.g., ['1tb', '2tb', '4tb'])
- `default_unit_price` (numeric) - Default price for this device
- `is_system` (boolean, default false) - System-defined templates cannot be deleted
- `created_by` (uuid, references auth.users) - User who created this template
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 3. Protocol Updates
- Protocol is stored as text, so no enum changes needed
- KNX can be used directly as a protocol value

## 4. Security
- Enable RLS on device_templates table
- All authenticated users can read all templates
- Users can create their own templates
- Users can update/delete only their own templates (except system templates)
- Admins have full access to all templates

## 5. Initial Data
- Insert common KNX device types as system templates
*/

-- Create device_templates table
CREATE TABLE IF NOT EXISTS device_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  default_protocol text,
  supports_gangs boolean DEFAULT false,
  supports_ports boolean DEFAULT false,
  supports_capacity boolean DEFAULT false,
  gang_options text[],
  port_options text[],
  capacity_options text[],
  default_unit_price numeric(10, 2) DEFAULT 0,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE device_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_templates
CREATE POLICY "Anyone can view all device templates"
  ON device_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own templates"
  ON device_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own non-system templates"
  ON device_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false)
  WITH CHECK (auth.uid() = created_by AND is_system = false);

CREATE POLICY "Users can delete their own non-system templates"
  ON device_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false);

CREATE POLICY "Admins have full access to all templates"
  ON device_templates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_device_templates_category ON device_templates(category);
CREATE INDEX idx_device_templates_created_by ON device_templates(created_by);
CREATE INDEX idx_device_templates_is_system ON device_templates(is_system);

-- Insert common KNX device types as system templates
INSERT INTO device_templates (name, category, description, default_protocol, supports_gangs, gang_options, default_unit_price, is_system, created_by) VALUES
  ('KNX Switch Actuator 1 Gang', 'mini_switch', 'KNX binary switch actuator with 1 output', 'knx', true, ARRAY['1'], 0, true, NULL),
  ('KNX Switch Actuator 2 Gang', 'mini_switch', 'KNX binary switch actuator with 2 outputs', 'knx', true, ARRAY['2'], 0, true, NULL),
  ('KNX Switch Actuator 4 Gang', 'mini_switch', 'KNX binary switch actuator with 4 outputs', 'knx', true, ARRAY['4'], 0, true, NULL),
  ('KNX Switch Actuator 8 Gang', 'mini_switch', 'KNX binary switch actuator with 8 outputs', 'knx', true, ARRAY['8'], 0, true, NULL),
  ('KNX Touch Panel 1 Gang', 'touch_switch', 'KNX touch panel with 1 button', 'knx', true, ARRAY['1'], 0, true, NULL),
  ('KNX Touch Panel 2 Gang', 'touch_switch', 'KNX touch panel with 2 buttons', 'knx', true, ARRAY['2'], 0, true, NULL),
  ('KNX Touch Panel 4 Gang', 'touch_switch', 'KNX touch panel with 4 buttons', 'knx', true, ARRAY['4'], 0, true, NULL),
  ('KNX Touch Panel 6 Gang', 'touch_switch', 'KNX touch panel with 6 buttons', 'knx', true, ARRAY['6'], 0, true, NULL),
  ('KNX Dimmer Actuator', 'mini_switch', 'KNX universal dimmer actuator', 'knx', true, ARRAY['1', '2', '4'], 0, true, NULL),
  ('KNX Shutter Actuator', 'shutter_switch', 'KNX blind/shutter actuator', 'knx', true, ARRAY['1', '2', '4'], 0, true, NULL),
  ('KNX Motion Sensor', 'motion_sensor', 'KNX presence detector with motion sensing', 'knx', false, NULL, 0, true, NULL),
  ('KNX Presence Sensor', 'presence_sensor', 'KNX presence detector with brightness sensor', 'knx', false, NULL, 0, true, NULL),
  ('KNX Temperature Sensor', 'motion_sensor', 'KNX room temperature sensor', 'knx', false, NULL, 0, true, NULL),
  ('KNX Weather Station', 'motion_sensor', 'KNX weather station with wind, rain, brightness sensors', 'knx', false, NULL, 0, true, NULL),
  ('KNX Binary Input 4-fold', 'mini_switch', 'KNX binary input module with 4 inputs', 'knx', true, ARRAY['4'], 0, true, NULL),
  ('KNX Binary Input 8-fold', 'mini_switch', 'KNX binary input module with 8 inputs', 'knx', true, ARRAY['8'], 0, true, NULL),
  ('KNX HVAC Controller', 'mini_switch', 'KNX heating/cooling controller', 'knx', false, NULL, 0, true, NULL),
  ('KNX RGB LED Controller', 'mini_switch', 'KNX RGB/RGBW LED controller', 'knx', true, ARRAY['1', '2', '4'], 0, true, NULL),
  ('KNX Power Supply 640mA', 'zigbee_hub', 'KNX power supply 640mA with choke', 'knx', false, NULL, 0, true, NULL),
  ('KNX Power Supply 320mA', 'zigbee_hub', 'KNX power supply 320mA', 'knx', false, NULL, 0, true, NULL),
  ('KNX IP Interface', 'zigbee_hub', 'KNX IP interface for ETS programming', 'knx', false, NULL, 0, true, NULL),
  ('KNX IP Router', 'zigbee_hub', 'KNX IP router for line coupling', 'knx', false, NULL, 0, true, NULL),
  ('KNX USB Interface', 'zigbee_hub', 'KNX USB interface for ETS programming', 'knx', false, NULL, 0, true, NULL);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_templates_updated_at
  BEFORE UPDATE ON device_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_device_templates_updated_at();
