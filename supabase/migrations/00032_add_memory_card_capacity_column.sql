-- Add memory_card_capacity column to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS memory_card_capacity TEXT;