/*
# Add Quotation Versioning, Approval, Payment, and Invoice Features

## 1. Plain English Explanation
This migration extends the quotations system to support:
- Version control: Each save creates a new version (V1, V2, V3...)
- Client approval workflow with approval dates
- Installation date tracking and automatic warranty calculation (18 months)
- Payment tracking with multiple payment methods
- Status management (Draft, Approved, Partially Paid, Fully Paid, Invoiced)
- Invoice conversion that locks the quotation

## 2. Table Modifications

### quotations (modified)
Added fields:
- `current_version` (integer): Current version number
- `client_approval` (boolean): Whether client has approved
- `approval_date` (date): Date of client approval
- `installation_date` (date): Installation date (required for invoice)
- `warranty_start_date` (date): Calculated from installation_date
- `warranty_end_date` (date): installation_date + 18 months
- `status` (text): Draft, Approved, Partially Paid, Fully Paid, Invoiced
- `is_invoice` (boolean): Whether converted to invoice
- `invoice_number` (text): Generated invoice number
- `total_paid` (numeric): Sum of all payments (calculated)
- `remaining_balance` (numeric): total_amount - total_paid (calculated)

### quotation_versions (new table)
- `id` (uuid, primary key): Version identifier
- `quotation_id` (uuid): Reference to parent quotation
- `version_number` (integer): Version number (V1, V2, V3...)
- `project_code` (text): Snapshot of project code
- `client_name` (text): Snapshot of client name
- `client_address` (text): Snapshot of client address
- `client_phone` (text): Snapshot of client phone
- `global_protocol` (text): Snapshot of protocol
- `vat_percentage` (numeric): Snapshot of VAT
- `rooms_data` (jsonb): Snapshot of rooms
- `devices_data` (jsonb): Snapshot of devices
- `commissioning_price` (numeric): Snapshot of commissioning price
- `installation_price` (numeric): Snapshot of installation price
- `total_amount` (numeric): Snapshot of total amount
- `client_approval` (boolean): Snapshot of approval status
- `approval_date` (date): Snapshot of approval date
- `installation_date` (date): Snapshot of installation date
- `created_at` (timestamptz): Version creation timestamp

### payments (new table)
- `id` (uuid, primary key): Payment identifier
- `quotation_id` (uuid): Reference to quotation
- `amount` (numeric): Payment amount
- `payment_date` (date): Date of payment
- `payment_method` (text): InstaPay, Visa, or Cash
- `cash_received_by` (text): Name of person who received cash (if Cash)
- `notes` (text): Additional payment notes
- `created_at` (timestamptz): Payment record creation timestamp

## 3. Security Changes
- Enable RLS on quotation_versions and payments tables
- quotation_versions policies:
  1. Admins can view all versions
  2. Users can view versions of their own quotations
  3. Users can create versions for their own quotations
- payments policies:
  1. Admins can view all payments
  2. Users can view payments for their own quotations
  3. Users can create payments for their own quotations
  4. Users can update payments for their own quotations
  5. Users can delete payments for their own quotations

## 4. RPC Functions
- `calculate_quotation_totals(quotation_id uuid)`: Calculates total_paid and remaining_balance
- `create_quotation_version(quotation_id uuid)`: Creates a new version snapshot
- `convert_to_invoice(quotation_id uuid)`: Converts quotation to invoice with generated number

## 5. Notes
- Versions are immutable once created
- Invoice conversion is irreversible
- Warranty period is exactly 18 months from installation date
- Status is automatically calculated based on approval and payment state
- Payment methods are restricted to: InstaPay, Visa, Cash
*/

-- Add new columns to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS client_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_date date,
ADD COLUMN IF NOT EXISTS installation_date date,
ADD COLUMN IF NOT EXISTS warranty_start_date date,
ADD COLUMN IF NOT EXISTS warranty_end_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Partially Paid', 'Fully Paid', 'Invoiced')),
ADD COLUMN IF NOT EXISTS is_invoice boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS total_paid numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance numeric(12,2) DEFAULT 0;

-- Create quotation_versions table
CREATE TABLE IF NOT EXISTS quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  project_code text NOT NULL,
  client_name text,
  client_address text,
  client_phone text,
  global_protocol text,
  vat_percentage numeric(5,2) DEFAULT 0,
  rooms_data jsonb DEFAULT '[]'::jsonb,
  devices_data jsonb DEFAULT '[]'::jsonb,
  commissioning_price numeric(10,2) DEFAULT 0,
  installation_price numeric(10,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  client_approval boolean DEFAULT false,
  approval_date date,
  installation_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quotation_id, version_number)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('InstaPay', 'Visa', 'Cash')),
  cash_received_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- quotation_versions policies
CREATE POLICY "Admins can view all versions" ON quotation_versions
  FOR SELECT TO authenticated USING (
    is_admin(auth.uid())
  );

CREATE POLICY "Users can view own quotation versions" ON quotation_versions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_versions.quotation_id
      AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for own quotations" ON quotation_versions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_versions.quotation_id
      AND q.user_id = auth.uid()
    )
  );

-- payments policies
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT TO authenticated USING (
    is_admin(auth.uid())
  );

CREATE POLICY "Users can view own quotation payments" ON payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = payments.quotation_id
      AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments for own quotations" ON payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = payments.quotation_id
      AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments for own quotations" ON payments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = payments.quotation_id
      AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments for own quotations" ON payments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = payments.quotation_id
      AND q.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id ON quotation_versions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_version_number ON quotation_versions(quotation_id, version_number);
CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_is_invoice ON quotations(is_invoice);

-- Create updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC: Calculate quotation totals
CREATE OR REPLACE FUNCTION calculate_quotation_totals(p_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_paid numeric(12,2);
  v_total_amount numeric(12,2);
  v_remaining_balance numeric(12,2);
  v_new_status text;
  v_client_approval boolean;
BEGIN
  -- Get total paid from payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE quotation_id = p_quotation_id;

  -- Get total amount and approval status
  SELECT total_amount, client_approval
  INTO v_total_amount, v_client_approval
  FROM quotations
  WHERE id = p_quotation_id;

  -- Calculate remaining balance
  v_remaining_balance := v_total_amount - v_total_paid;

  -- Determine status
  IF v_remaining_balance = 0 AND v_total_paid > 0 THEN
    v_new_status := 'Fully Paid';
  ELSIF v_total_paid > 0 AND v_remaining_balance > 0 THEN
    v_new_status := 'Partially Paid';
  ELSIF v_client_approval THEN
    v_new_status := 'Approved';
  ELSE
    v_new_status := 'Draft';
  END IF;

  -- Update quotation
  UPDATE quotations
  SET
    total_paid = v_total_paid,
    remaining_balance = v_remaining_balance,
    status = CASE WHEN is_invoice THEN 'Invoiced' ELSE v_new_status END,
    updated_at = now()
  WHERE id = p_quotation_id;
END;
$$;

-- RPC: Create quotation version
CREATE OR REPLACE FUNCTION create_quotation_version(p_quotation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_number integer;
  v_quotation quotations%ROWTYPE;
BEGIN
  -- Get current quotation data
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  -- Check if quotation is an invoice (no more versions allowed)
  IF v_quotation.is_invoice THEN
    RAISE EXCEPTION 'Cannot create version for invoiced quotation';
  END IF;

  -- Get next version number
  v_version_number := v_quotation.current_version + 1;

  -- Create version snapshot
  INSERT INTO quotation_versions (
    quotation_id,
    version_number,
    project_code,
    client_name,
    client_address,
    client_phone,
    global_protocol,
    vat_percentage,
    rooms_data,
    devices_data,
    commissioning_price,
    installation_price,
    total_amount,
    client_approval,
    approval_date,
    installation_date
  ) VALUES (
    p_quotation_id,
    v_version_number,
    v_quotation.project_code,
    v_quotation.client_name,
    v_quotation.client_address,
    v_quotation.client_phone,
    v_quotation.global_protocol,
    v_quotation.vat_percentage,
    v_quotation.rooms_data,
    v_quotation.devices_data,
    v_quotation.commissioning_price,
    v_quotation.installation_price,
    v_quotation.total_amount,
    v_quotation.client_approval,
    v_quotation.approval_date,
    v_quotation.installation_date
  );

  -- Update current version number
  UPDATE quotations
  SET current_version = v_version_number,
      updated_at = now()
  WHERE id = p_quotation_id;

  RETURN v_version_number;
END;
$$;

-- RPC: Convert to invoice
CREATE OR REPLACE FUNCTION convert_to_invoice(p_quotation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_number text;
  v_remaining_balance numeric(12,2);
  v_year text;
  v_sequence integer;
BEGIN
  -- Check remaining balance
  SELECT remaining_balance INTO v_remaining_balance
  FROM quotations
  WHERE id = p_quotation_id;

  IF v_remaining_balance != 0 THEN
    RAISE EXCEPTION 'Cannot convert to invoice: remaining balance must be zero';
  END IF;

  -- Generate invoice number: INV-YYYY-NNNN
  v_year := TO_CHAR(now(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || v_year || '-(.*)') AS integer)
  ), 0) + 1
  INTO v_sequence
  FROM quotations
  WHERE invoice_number LIKE 'INV-' || v_year || '-%';

  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::text, 4, '0');

  -- Update quotation to invoice
  UPDATE quotations
  SET
    is_invoice = true,
    invoice_number = v_invoice_number,
    status = 'Invoiced',
    updated_at = now()
  WHERE id = p_quotation_id;

  RETURN v_invoice_number;
END;
$$;

-- Trigger to auto-calculate warranty dates when installation_date is set
CREATE OR REPLACE FUNCTION calculate_warranty_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.installation_date IS NOT NULL THEN
    NEW.warranty_start_date := NEW.installation_date;
    NEW.warranty_end_date := NEW.installation_date + INTERVAL '18 months';
  ELSE
    NEW.warranty_start_date := NULL;
    NEW.warranty_end_date := NULL;
  END IF;
  
  -- Auto-calculate remaining balance
  NEW.remaining_balance := NEW.total_amount - NEW.total_paid;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_warranty_dates_trigger
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_warranty_dates();