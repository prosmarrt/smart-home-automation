/*
# Add intercom_type column and update protocol enum

## Purpose
Add support for intercom component types (doorbell, indoor station) and new protocol types (wired, lan).

## Changes
1. Add intercom_type column to devices table
2. Update protocol type to include 'wired' and 'lan'

## Notes
- intercom_type is nullable (only used for intercom devices)
- New protocols: wired, lan (in addition to zigbee, matter, wifi)
*/

-- Add intercom_type column to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS intercom_type text;

-- No need to alter protocol column as it's already text type and accepts any value
-- The TypeScript types will enforce the new protocol values on the frontend