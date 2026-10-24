/*
# Add Last Amendment Date to Client Info

1. Schema Changes
   - Add `last_amendment_date` column to `client_info` table
   - Type: timestamptz (timestamp with timezone)
   - Default: NULL (will be set when quotation is amended)

2. Purpose
   - Track when quotations are last modified
   - Automatically update on any device or room changes
   - Display prominently in PDF quotations

3. Notes
   - This field will be updated via application logic when devices/rooms are modified
   - Displayed in quotation header for visibility
*/

ALTER TABLE client_info 
ADD COLUMN IF NOT EXISTS last_amendment_date timestamptz DEFAULT NULL;