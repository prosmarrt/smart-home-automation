
-- ── 1. Expense Categories ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  is_default  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

-- Seed default categories
INSERT INTO expense_categories (name, description, is_default) VALUES
  ('Operating Costs',       'General facility overhead, office lease, shared building charges, daily administration', true),
  ('Salaries & Wages',      'Non-project staff salaries, management, sales commissions, administrative payroll & bonuses', true),
  ('Utilities & Facilities','Electricity, municipal water, high-speed fiber internet, security, HVAC maintenance', true),
  ('Marketing & Advertising','Digital PPC campaigns, showroom promotions, collateral printing, trade show presence', true),
  ('Equipment & Maintenance','Testing & calibration tool upkeep, diagnostic software licenses, field vehicle service', true),
  ('Shipping & Logistics',  'Freight inbound/outbound, courier delivery, express customs clearance, packaging supplies', true),
  ('Taxes & Compliance',    'Municipal taxes, safety certifications, annual company registration, ISO quality compliance', true),
  ('Professional Services', 'External corporate counsel retainers, CPA audit fees, specialized tax & IT consulting', true),
  ('Depreciation',          'Scheduled straight-line depreciation of office furniture, diagnostic computers, showroom gear', true),
  ('Miscellaneous / Other', 'Incidental office supplies, employee hospitality, technical periodicals, emergency petty cash', true)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Expenses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  amount      numeric(14,2) NOT NULL CHECK (amount >= 0),
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor      text,
  notes       text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Auto-update updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_expenses_updated_at ON expenses;
CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER set_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- expense_categories: admins manage, all authenticated read
CREATE POLICY "Authenticated users can read categories"
  ON expense_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert categories"
  ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update categories"
  ON expense_categories FOR UPDATE
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete custom categories"
  ON expense_categories FOR DELETE
  TO authenticated USING (is_admin(auth.uid()) AND is_default = false);

-- expenses: admins have full access; regular users read-only
CREATE POLICY "Authenticated users can read expenses"
  ON expenses FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert expenses"
  ON expenses FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update expenses"
  ON expenses FOR UPDATE
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));
