-- Add price_snapshot_date to quotations table to track when prices were captured
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS price_snapshot_date timestamptz DEFAULT now();

-- Create index for faster queries on price_snapshot_date
CREATE INDEX IF NOT EXISTS idx_quotations_price_snapshot_date ON quotations(price_snapshot_date);

-- Add comment
COMMENT ON COLUMN quotations.price_snapshot_date IS 'Timestamp when device prices were captured for this quotation';