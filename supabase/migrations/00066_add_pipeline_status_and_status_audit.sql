
-- Quotation status audit trail table
CREATE TABLE IF NOT EXISTS quotation_status_audit (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id  uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  changed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status   text,
  to_status     text NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qsa_quotation_id ON quotation_status_audit(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qsa_created_at   ON quotation_status_audit(created_at DESC);

-- Enable RLS
ALTER TABLE quotation_status_audit ENABLE ROW LEVEL SECURITY;

-- RLS: users see only their own quotation audit rows
CREATE POLICY "Users can view own quotation status audit"
  ON quotation_status_audit FOR SELECT
  USING (
    quotation_id IN (
      SELECT id FROM quotations WHERE user_id = auth.uid()
    )
  );

-- RLS: users can insert audit rows for their own quotations
CREATE POLICY "Users can insert own quotation status audit"
  ON quotation_status_audit FOR INSERT
  WITH CHECK (
    quotation_id IN (
      SELECT id FROM quotations WHERE user_id = auth.uid()
    )
  );

-- Admins can see all audit rows
CREATE POLICY "Admins can view all quotation status audit"
  ON quotation_status_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
