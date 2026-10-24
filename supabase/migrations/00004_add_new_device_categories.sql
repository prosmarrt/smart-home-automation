/*
# Add New Device Categories

## Overview
This migration adds support for new device categories:
- NVR (Network Video Recorder) with HDD capacity options
- Network Switches with port count options (already exists, adding port options)
- CAT6 Cables (per meter pricing)
- Custom Devices (flexible category for other devices)

## Changes
- Add new fields to devices table:
  - `hdd_capacity` (text): For NVR HDD options (500GB, 1TB, 2TB)
  - `cable_length` (numeric): For cable length in meters
  - `custom_name` (text): For custom device names
  - `custom_description` (text): For custom device descriptions

## New Device Categories
- `nvr`: Network Video Recorder
- `hdd`: Hard Disk Drive (standalone)
- `cat6_cable`: CAT6 Network Cable
- `custom_device`: Custom/Other devices

## Notes
- Network switches already exist but will use port_count field
- All new devices support unit pricing and VAT
*/

-- Add new columns to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hdd_capacity text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS cable_length numeric;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS custom_name text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS custom_description text;
