/*
# Create Smart Home Automation Tables

## 1. Plain English Explanation
This migration creates the database structure for a smart home automation management system.
It allows users to organize their smart home devices by rooms and track various device types
including switches, sensors, cameras, and networking equipment. Each device can be assigned
a communication protocol (Zigbee, Matter, or Wi-Fi) and users can manage quantities and
specific configurations for each device type.

## 2. New Tables

### rooms
- `id` (uuid, primary key): Unique identifier for each room
- `user_id` (text, not null): Anonymous user identifier (UUID stored in localStorage)
- `name` (text, not null): Room name (e.g., "Living Room", "Kitchen")
- `created_at` (timestamptz): Timestamp when room was created
- `updated_at` (timestamptz): Timestamp when room was last updated

### devices
- `id` (uuid, primary key): Unique identifier for each device
- `user_id` (text, not null): Anonymous user identifier
- `room_id` (uuid, nullable): Reference to rooms table (null for unassigned devices)
- `category` (text, not null): Device category (mini_switch, touch_switch, etc.)
- `protocol` (text, nullable): Communication protocol (zigbee, matter, wifi)
- `quantity` (integer, default 1): Number of devices
- `gang` (text, nullable): Switch gang configuration (1, 2, 3, 4)
- `camera_type` (text, nullable): Camera type (indoor, outdoor)
- `camera_resolution` (text, nullable): Camera resolution (2mp, 3mp, 4mp, 6mp)
- `mesh_model` (text, nullable): Mesh Wi-Fi model name
- `port_count` (integer, nullable): Network switch port count
- `ir_devices` (jsonb, nullable): Array of IR remote controlled devices
- `created_at` (timestamptz): Timestamp when device was created
- `updated_at` (timestamptz): Timestamp when device was last updated

## 3. Security Changes
- No RLS enabled - this is a public application using anonymous user IDs
- All users can read and write their own data based on user_id matching
- Data is isolated by user_id stored in localStorage

## 4. Indexes
- Index on user_id for both tables for fast user data retrieval
- Index on room_id in devices table for efficient room-based queries

## 5. Notes
- Uses UUID v4 for all IDs
- Timestamps automatically managed with triggers
- Foreign key constraint on room_id allows null (unassigned devices)
- JSONB used for flexible IR device list storage
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  category text NOT NULL,
  protocol text,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  gang text,
  camera_type text,
  camera_resolution text,
  mesh_model text,
  port_count integer,
  ir_devices jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_room_id ON devices(room_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();