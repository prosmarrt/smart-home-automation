CREATE TABLE IF NOT EXISTS category_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  display_label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY "Allow anyone to read category labels"
  ON category_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow admins to manage category labels"
  ON category_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
