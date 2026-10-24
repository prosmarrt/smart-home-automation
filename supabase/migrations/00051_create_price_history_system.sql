-- Create price_history table for tracking all price changes
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_price_id uuid REFERENCES device_prices(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  device_name text NOT NULL,
  device_category text NOT NULL,
  old_price numeric(10, 2) NOT NULL,
  new_price numeric(10, 2) NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('update', 'revert', 'apply_increase', 'ignore_update', 'initial')),
  change_reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_device_price ON price_history(device_price_id);
CREATE INDEX IF NOT EXISTS idx_price_history_quotation ON price_history(quotation_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by ON price_history(changed_by);

-- Add price update tracking fields to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS pending_price_update boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS update_ignored_at timestamptz,
ADD COLUMN IF NOT EXISTS update_applied_at timestamptz,
ADD COLUMN IF NOT EXISTS update_ignored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS update_applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE price_history IS 'Comprehensive audit log of all device price changes';
COMMENT ON COLUMN price_history.change_type IS 'Type of change: update, revert, apply_increase, ignore_update, initial';
COMMENT ON COLUMN price_history.change_reason IS 'Reason for price change (e.g., Supplier Cost Update, Promotional Discount)';
COMMENT ON COLUMN quotations.pending_price_update IS 'Indicates if quotation has pending price updates';
COMMENT ON COLUMN quotations.update_ignored_at IS 'Timestamp when price update was ignored';
COMMENT ON COLUMN quotations.update_applied_at IS 'Timestamp when price update was applied';

-- RLS Policies for price_history (admin-only write, authenticated read)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read price history
CREATE POLICY "Allow authenticated users to read price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert price history (will be restricted in app logic)
CREATE POLICY "Allow authenticated users to insert price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);