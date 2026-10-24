/*
# Add Central Control Devices - Alexa and Control Screens

## 1. Overview
This migration adds Central Control device templates including:
- Amazon Alexa devices (Echo Pop, Echo Dot, Echo Show variants)
- Central Control Screens (4", 5", 8", 12" with various features)

## 2. Device Categories

### Alexa Devices
- Echo Pop (compact smart speaker)
- Echo Dot (3rd, 4th, 5th Gen)
- Echo Show 5 (5" display)
- Echo Show 8 (8" display)
- Echo Show 10 (10" display with motion)
- Echo Show 15 (15" wall-mounted display)

### Central Control Screens
- 4" Control Screen (basic, with amp, with Alexa, with Zigbee)
- 5" Control Screen (basic, with amp, with Alexa, with Zigbee)
- 8" Control Screen (basic, with amp, with Alexa, with Zigbee)
- 12" Control Screen (basic, with amp, with Alexa, with Zigbee)

## 3. Features
- All devices support room assignment
- Price tracking enabled
- WiFi/LAN protocol support
- System templates (is_system = true)

## 4. Security
- Existing RLS policies apply
- No additional security changes needed
*/

-- Insert Alexa Device Templates
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  -- Echo Pop
  ('Echo Pop', 'central_control', 'Compact smart speaker with Alexa', 'wifi', 'Amazon', false, false, false, true),
  
  -- Echo Dot Variants
  ('Echo Dot (3rd Gen)', 'central_control', 'Smart speaker with Alexa (3rd Generation)', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Dot (4th Gen)', 'central_control', 'Smart speaker with Alexa (4th Generation)', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Dot (5th Gen)', 'central_control', 'Smart speaker with Alexa and improved audio (5th Gen)', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Dot with Clock (5th Gen)', 'central_control', 'Smart speaker with Alexa and LED display', 'wifi', 'Amazon', false, false, false, true),
  
  -- Echo Show Variants
  ('Echo Show 5 (3rd Gen)', 'central_control', '5.5" smart display with Alexa', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Show 8 (3rd Gen)', 'central_control', '8" HD smart display with Alexa', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Show 10 (3rd Gen)', 'central_control', '10.1" HD smart display with motion tracking', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Show 15', 'central_control', '15.6" Full HD smart display for wall mount', 'wifi', 'Amazon', false, false, false, true),
  
  -- Echo Standard
  ('Echo (4th Gen)', 'central_control', 'Smart speaker with premium sound and Alexa', 'wifi', 'Amazon', false, false, false, true),
  ('Echo Studio', 'central_control', 'High-fidelity smart speaker with 3D audio', 'wifi', 'Amazon', false, false, false, true);

-- Insert Central Control Screen Templates (4" variants)
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Control Screen 4" - Basic', 'central_control', '4" touchscreen control panel with WiFi', 'wifi', NULL, false, false, false, true),
  ('Control Screen 4" - with Amp', 'central_control', '4" touchscreen with built-in amplifier', 'wifi', NULL, false, false, false, true),
  ('Control Screen 4" - with Alexa', 'central_control', '4" touchscreen with Alexa voice control', 'wifi', NULL, false, false, false, true),
  ('Control Screen 4" - with Zigbee', 'central_control', '4" touchscreen with built-in Zigbee hub', 'wifi', NULL, false, false, false, true),
  ('Control Screen 4" - Full Featured', 'central_control', '4" touchscreen with Amp, Alexa, Zigbee, WiFi, LAN', 'lan', NULL, false, false, false, true);

-- Insert Central Control Screen Templates (5" variants)
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Control Screen 5" - Basic', 'central_control', '5" touchscreen control panel with WiFi', 'wifi', NULL, false, false, false, true),
  ('Control Screen 5" - with Amp', 'central_control', '5" touchscreen with built-in amplifier', 'wifi', NULL, false, false, false, true),
  ('Control Screen 5" - with Alexa', 'central_control', '5" touchscreen with Alexa voice control', 'wifi', NULL, false, false, false, true),
  ('Control Screen 5" - with Zigbee', 'central_control', '5" touchscreen with built-in Zigbee hub', 'wifi', NULL, false, false, false, true),
  ('Control Screen 5" - Full Featured', 'central_control', '5" touchscreen with Amp, Alexa, Zigbee, WiFi, LAN', 'lan', NULL, false, false, false, true);

-- Insert Central Control Screen Templates (8" variants)
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Control Screen 8" - Basic', 'central_control', '8" touchscreen control panel with WiFi', 'wifi', NULL, false, false, false, true),
  ('Control Screen 8" - with Amp', 'central_control', '8" touchscreen with built-in amplifier', 'wifi', NULL, false, false, false, true),
  ('Control Screen 8" - with Alexa', 'central_control', '8" touchscreen with Alexa voice control', 'wifi', NULL, false, false, false, true),
  ('Control Screen 8" - with Zigbee', 'central_control', '8" touchscreen with built-in Zigbee hub', 'wifi', NULL, false, false, false, true),
  ('Control Screen 8" - Full Featured', 'central_control', '8" touchscreen with Amp, Alexa, Zigbee, WiFi, LAN', 'lan', NULL, false, false, false, true);

-- Insert Central Control Screen Templates (12" variants)
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Control Screen 12" - Basic', 'central_control', '12" touchscreen control panel with WiFi', 'wifi', NULL, false, false, false, true),
  ('Control Screen 12" - with Amp', 'central_control', '12" touchscreen with built-in amplifier', 'wifi', NULL, false, false, false, true),
  ('Control Screen 12" - with Alexa', 'central_control', '12" touchscreen with Alexa voice control', 'wifi', NULL, false, false, false, true),
  ('Control Screen 12" - with Zigbee', 'central_control', '12" touchscreen with built-in Zigbee hub', 'wifi', NULL, false, false, false, true),
  ('Control Screen 12" - Full Featured', 'central_control', '12" touchscreen with Amp, Alexa, Zigbee, WiFi, LAN', 'lan', NULL, false, false, false, true);

-- Create index for central_control category for faster queries
CREATE INDEX IF NOT EXISTS idx_device_templates_central_control 
ON device_templates(category) 
WHERE category = 'central_control';