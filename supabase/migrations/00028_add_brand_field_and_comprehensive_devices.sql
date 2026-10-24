/*
# Add Brand Field and Comprehensive Wireless Smart Devices

## 1. Overview
This migration adds a brand field to device_templates and populates the database with
a comprehensive list of wireless smart home devices across all major categories.

## 2. Schema Changes

### device_templates table updates
- Add `brand` (text) - Brand/manufacturer name for the device

## 3. Device Categories Covered

### Lighting & Control
- Smart Bulbs (White, RGB, RGBW, Tunable White)
- Smart Light Strips
- Smart Dimmers
- Smart Switches (already exists)
- Smart Plugs/Outlets
- Smart Wall Panels

### Security & Surveillance
- Indoor/Outdoor Cameras (already exists)
- Doorbell Cameras
- PTZ Cameras
- Door/Window Sensors
- Motion Sensors
- Glass Break Sensors
- Smart Locks

### Climate Control
- Smart Thermostats
- Smart AC Controllers
- Smart Fans
- Smart Heaters
- Temperature/Humidity Sensors

### Safety Sensors
- Smoke Detectors
- CO Detectors
- Gas Leak Sensors (already exists)
- Water Leak Sensors (already exists)
- Flood Sensors

### Automation & Control
- IR Remote Controllers (already exists)
- Smart Hubs/Gateways
- Scene Controllers
- Smart Buttons
- Presence Sensors

### Window & Shade Control
- Smart Blinds/Shades
- Curtain Motors
- Window Openers

### Appliances & Utilities
- Smart Valves (already exists)
- Smart Garage Door Openers
- Smart Doorbells
- Smart Speakers
- Smart Displays

### Networking
- Mesh Wi-Fi Systems (already exists)
- Access Points (already exists)
- Network Switches (already exists)
- Smart Routers

## 4. Security
- No RLS changes needed
- Existing policies apply to new brand field

## 5. Notes
- Brand field is optional to maintain backward compatibility
- System templates are marked with is_system = true
- All devices support multiple protocols (Zigbee, Matter, Wi-Fi, KNX, Wired, LAN)
*/

-- Add brand field to device_templates table
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS brand text;

-- Add index for brand searches
CREATE INDEX IF NOT EXISTS idx_device_templates_brand ON device_templates(brand);

-- Insert comprehensive wireless smart device templates

-- LIGHTING & CONTROL CATEGORY

-- Smart Bulbs
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Bulb - White', 'switches', 'Dimmable white smart bulb', 'zigbee', NULL, false, false, false, true),
  ('Smart Bulb - Tunable White', 'switches', 'Color temperature adjustable smart bulb (2700K-6500K)', 'zigbee', NULL, false, false, false, true),
  ('Smart Bulb - RGB', 'switches', 'Full color RGB smart bulb', 'zigbee', NULL, false, false, false, true),
  ('Smart Bulb - RGBW', 'switches', 'Full color RGB + white smart bulb', 'zigbee', NULL, false, false, false, true),
  ('Smart Candle Bulb', 'switches', 'Decorative candle-shaped smart bulb', 'zigbee', NULL, false, false, false, true),
  ('Smart Spotlight/GU10', 'switches', 'Smart spotlight bulb (GU10 base)', 'zigbee', NULL, false, false, false, true);

-- Smart Light Strips
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Light Strip - RGB', 'switches', 'Flexible RGB LED light strip', 'zigbee', NULL, false, false, false, true),
  ('Smart Light Strip - RGBW', 'switches', 'Flexible RGBW LED light strip with white channel', 'zigbee', NULL, false, false, false, true),
  ('Smart Light Strip Extension', 'switches', 'Extension kit for smart light strips', 'zigbee', NULL, false, false, false, true);

-- Smart Dimmers
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Dimmer Switch', 'switches', 'In-wall dimmer switch for dimmable lights', 'zigbee', NULL, false, false, false, true),
  ('Smart Rotary Dimmer', 'switches', 'Rotary control dimmer switch', 'zigbee', NULL, false, false, false, true),
  ('Smart Touch Dimmer', 'switches', 'Touch-sensitive dimmer control', 'zigbee', NULL, false, false, false, true);

-- Smart Plugs & Outlets
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Plug - Single', 'switches', 'Single outlet smart plug with energy monitoring', 'wifi', NULL, false, false, false, true),
  ('Smart Plug - Dual', 'switches', 'Dual outlet smart plug with independent control', 'wifi', NULL, false, false, false, true),
  ('Smart Plug - USB', 'switches', 'Smart plug with USB charging ports', 'wifi', NULL, false, false, false, true),
  ('Smart Outlet - In-Wall', 'switches', 'In-wall smart outlet replacement', 'zigbee', NULL, false, false, false, true),
  ('Smart Power Strip', 'switches', 'Multi-outlet smart power strip with individual control', 'wifi', NULL, false, false, false, true);

-- Smart Wall Panels
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Scene Panel', 'switches', 'Wall-mounted scene control panel', 'zigbee', NULL, false, false, false, true),
  ('Smart Display Panel', 'switches', 'Touch screen control panel with display', 'wifi', NULL, false, false, false, true);

-- SECURITY & SURVEILLANCE CATEGORY

-- Cameras
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Doorbell Camera', 'cameras', 'Smart video doorbell with two-way audio', 'wifi', NULL, false, false, false, true),
  ('PTZ Camera - Indoor', 'cameras', 'Pan-Tilt-Zoom indoor security camera', 'wifi', NULL, false, false, false, true),
  ('PTZ Camera - Outdoor', 'cameras', 'Weatherproof PTZ outdoor camera', 'wifi', NULL, false, false, false, true),
  ('Floodlight Camera', 'cameras', 'Outdoor camera with integrated floodlight', 'wifi', NULL, false, false, false, true),
  ('Battery Camera', 'cameras', 'Wire-free battery-powered camera', 'wifi', NULL, false, false, false, true);

-- Security Sensors
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Door/Window Sensor', 'sensors', 'Magnetic contact sensor for doors and windows', 'zigbee', NULL, false, false, false, true),
  ('Motion Sensor - PIR', 'sensors', 'Passive infrared motion detector', 'zigbee', NULL, false, false, false, true),
  ('Motion Sensor - Dual Tech', 'sensors', 'PIR + Microwave dual technology motion sensor', 'zigbee', NULL, false, false, false, true),
  ('Glass Break Sensor', 'sensors', 'Acoustic glass break detector', 'zigbee', NULL, false, false, false, true),
  ('Vibration Sensor', 'sensors', 'Detects vibration and tampering', 'zigbee', NULL, false, false, false, true),
  ('Presence Sensor', 'sensors', 'mmWave presence detection sensor', 'zigbee', NULL, false, false, false, true);

-- Smart Locks
INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Lock - Deadbolt', 'sensors', 'Smart deadbolt lock with keypad', 'zigbee', NULL, false, false, false, true),
  ('Smart Lock - Lever', 'sensors', 'Smart lever handle lock', 'zigbee', NULL, false, false, false, true),
  ('Smart Lock - Retrofit', 'sensors', 'Retrofit smart lock (keeps existing keys)', 'zigbee', NULL, false, false, false, true),
  ('Smart Padlock', 'sensors', 'Bluetooth/WiFi smart padlock', 'wifi', NULL, false, false, false, true);

-- CLIMATE CONTROL CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Thermostat', 'sensors', 'Programmable smart thermostat with learning', 'wifi', NULL, false, false, false, true),
  ('Smart Thermostat - Basic', 'sensors', 'Basic programmable smart thermostat', 'zigbee', NULL, false, false, false, true),
  ('Smart AC Controller', 'ir_remotes', 'IR controller for air conditioners', 'wifi', NULL, false, false, false, true),
  ('Smart Ceiling Fan Controller', 'switches', 'In-wall smart fan speed controller', 'zigbee', NULL, false, false, false, true),
  ('Smart Fan - Standalone', 'switches', 'Smart ceiling fan with integrated control', 'wifi', NULL, false, false, false, true),
  ('Smart Heater Controller', 'switches', 'Smart plug for heater control with temperature monitoring', 'wifi', NULL, false, false, false, true),
  ('Temperature Sensor', 'sensors', 'Wireless temperature sensor', 'zigbee', NULL, false, false, false, true),
  ('Temperature/Humidity Sensor', 'sensors', 'Combined temperature and humidity sensor', 'zigbee', NULL, false, false, false, true),
  ('Air Quality Monitor', 'sensors', 'Monitors air quality, VOC, CO2, PM2.5', 'wifi', NULL, false, false, false, true);

-- SAFETY SENSORS CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smoke Detector', 'sensors', 'Smart smoke detector with alerts', 'zigbee', NULL, false, false, false, true),
  ('Smoke + CO Detector', 'sensors', 'Combined smoke and carbon monoxide detector', 'zigbee', NULL, false, false, false, true),
  ('CO Detector', 'sensors', 'Carbon monoxide detector', 'zigbee', NULL, false, false, false, true),
  ('Flood Sensor', 'sensors', 'Floor-level water/flood detection sensor', 'zigbee', NULL, false, false, false, true);

-- AUTOMATION & CONTROL CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Hub/Gateway', 'networking', 'Central smart home hub/gateway', 'lan', NULL, false, false, false, true),
  ('Zigbee Hub', 'networking', 'Dedicated Zigbee coordinator hub', 'zigbee', NULL, false, false, false, true),
  ('Matter Hub', 'networking', 'Matter protocol hub/bridge', 'matter', NULL, false, false, false, true),
  ('Scene Controller - 4 Button', 'switches', '4-button wireless scene controller', 'zigbee', NULL, false, false, false, true),
  ('Scene Controller - 6 Button', 'switches', '6-button wireless scene controller', 'zigbee', NULL, false, false, false, true),
  ('Smart Button - Single', 'switches', 'Single programmable smart button', 'zigbee', NULL, false, false, false, true),
  ('Smart Button - Double', 'switches', 'Double programmable smart button', 'zigbee', NULL, false, false, false, true),
  ('Smart Dial/Knob', 'switches', 'Rotary control knob for scenes and dimming', 'zigbee', NULL, false, false, false, true),
  ('Remote Control - Universal', 'ir_remotes', 'Universal IR remote control', 'wifi', NULL, false, false, false, true);

-- WINDOW & SHADE CONTROL CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Blinds Motor', 'switches', 'Motor for roller blinds automation', 'zigbee', NULL, false, false, false, true),
  ('Smart Curtain Motor', 'switches', 'Motor for curtain track automation', 'zigbee', NULL, false, false, false, true),
  ('Smart Curtain Motor - Dual', 'switches', 'Dual motor for split curtains', 'zigbee', NULL, false, false, false, true),
  ('Window Opener Motor', 'switches', 'Automated window opener', 'zigbee', NULL, false, false, false, true),
  ('Smart Shade - Battery', 'switches', 'Battery-powered smart roller shade', 'zigbee', NULL, false, false, false, true),
  ('Smart Shade - Solar', 'switches', 'Solar-powered smart roller shade', 'zigbee', NULL, false, false, false, true);

-- APPLIANCES & UTILITIES CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Garage Door Opener', 'switches', 'Smart garage door controller', 'wifi', NULL, false, false, false, true),
  ('Smart Garage Door Sensor', 'sensors', 'Garage door open/close sensor', 'zigbee', NULL, false, false, false, true),
  ('Smart Doorbell - Wired', 'intercom', 'Smart doorbell with chime (wired)', 'wifi', NULL, false, false, false, true),
  ('Smart Doorbell - Battery', 'intercom', 'Battery-powered smart doorbell', 'wifi', NULL, false, false, false, true),
  ('Smart Speaker', 'switches', 'Voice-controlled smart speaker', 'wifi', NULL, false, false, false, true),
  ('Smart Display - Small', 'switches', 'Smart display with voice assistant (5-7 inch)', 'wifi', NULL, false, false, false, true),
  ('Smart Display - Medium', 'switches', 'Smart display with voice assistant (8-10 inch)', 'wifi', NULL, false, false, false, true),
  ('Smart Display - Large', 'switches', 'Smart display with voice assistant (10+ inch)', 'wifi', NULL, false, false, false, true),
  ('Smart Irrigation Controller', 'valves', 'Multi-zone irrigation controller', 'wifi', NULL, false, false, false, true),
  ('Smart Sprinkler Valve', 'valves', 'Individual smart sprinkler valve', 'zigbee', NULL, false, false, false, true),
  ('Energy Monitor', 'sensors', 'Whole-home energy monitoring system', 'wifi', NULL, false, false, false, true),
  ('Smart Circuit Breaker', 'switches', 'Individual circuit monitoring and control', 'wifi', NULL, false, false, false, true);

-- NETWORKING CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Router', 'networking', 'Smart WiFi router with app control', 'wifi', NULL, false, false, false, true),
  ('WiFi Range Extender', 'networking', 'WiFi signal range extender', 'wifi', NULL, false, false, false, true),
  ('PoE Injector', 'networking', 'Power over Ethernet injector', 'lan', NULL, false, false, false, true),
  ('PoE Switch', 'networking', 'Network switch with PoE support', 'lan', NULL, true, true, false, true);

-- ENTERTAINMENT & MEDIA CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart TV Controller', 'ir_remotes', 'IR/WiFi controller for smart TVs', 'wifi', NULL, false, false, false, true),
  ('Streaming Device', 'switches', 'Smart streaming media player', 'wifi', NULL, false, false, false, true),
  ('Smart Soundbar', 'switches', 'WiFi-enabled soundbar', 'wifi', NULL, false, false, false, true),
  ('Smart Subwoofer', 'switches', 'Wireless smart subwoofer', 'wifi', NULL, false, false, false, true);

-- SPECIALTY DEVICES CATEGORY

INSERT INTO device_templates (name, category, description, default_protocol, brand, supports_gangs, supports_ports, supports_capacity, is_system)
VALUES
  ('Smart Pet Feeder', 'switches', 'Automated pet feeding system', 'wifi', NULL, false, false, false, true),
  ('Smart Pet Camera', 'cameras', 'Pet monitoring camera with treat dispenser', 'wifi', NULL, false, false, false, true),
  ('Smart Plant Sensor', 'sensors', 'Soil moisture and light sensor for plants', 'zigbee', NULL, false, false, false, true),
  ('Smart Mailbox Sensor', 'sensors', 'Mailbox open/close notification sensor', 'zigbee', NULL, false, false, false, true),
  ('Smart Bed Sensor', 'sensors', 'Sleep tracking and bed occupancy sensor', 'wifi', NULL, false, false, false, true),
  ('Smart Mirror', 'switches', 'Smart mirror with display and lighting', 'wifi', NULL, false, false, false, true),
  ('Smart Trash Can', 'switches', 'Automatic lid opening trash can', 'wifi', NULL, false, false, false, true),
  ('Smart Air Purifier', 'switches', 'WiFi-enabled air purifier', 'wifi', NULL, false, false, false, true),
  ('Smart Humidifier', 'switches', 'WiFi-enabled humidifier', 'wifi', NULL, false, false, false, true),
  ('Smart Dehumidifier', 'switches', 'WiFi-enabled dehumidifier', 'wifi', NULL, false, false, false, true),
  ('Smart Coffee Maker', 'switches', 'WiFi-enabled coffee maker', 'wifi', NULL, false, false, false, true),
  ('Smart Kettle', 'switches', 'WiFi-enabled electric kettle', 'wifi', NULL, false, false, false, true),
  ('Smart Oven Controller', 'switches', 'Smart plug for oven monitoring', 'wifi', NULL, false, false, false, true),
  ('Smart Refrigerator Sensor', 'sensors', 'Temperature monitoring for refrigerator', 'zigbee', NULL, false, false, false, true),
  ('Smart Leak Detector - Rope', 'sensors', 'Rope-style water leak detector for large areas', 'zigbee', NULL, false, false, false, true),
  ('Smart Siren/Alarm', 'switches', 'Smart security siren and alarm', 'zigbee', NULL, false, false, false, true),
  ('Smart Keypad', 'switches', 'Wireless security keypad', 'zigbee', NULL, false, false, false, true),
  ('Smart Panic Button', 'switches', 'Emergency panic button', 'zigbee', NULL, false, false, false, true);

-- Update the updated_at timestamp trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_device_templates_updated_at ON device_templates;
CREATE TRIGGER update_device_templates_updated_at
    BEFORE UPDATE ON device_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
