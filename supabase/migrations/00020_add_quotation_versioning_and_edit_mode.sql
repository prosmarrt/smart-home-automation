/*
# Add Quotation Versioning and Edit Mode

## 1. Plain English Explanation
This migration adds version control to quotations. When a quotation is edited and saved:
- A new version is created (V1, V2, V3, etc.)
- The version number is appended to the project code
- All previous versions are retained for history
- Admins can edit device prices in quotations

## 2. Table Modifications

### quotations (modified)
Added fields:
- `version_number` (integer): Current version number (1, 2, 3...)
- `parent_quotation_id` (uuid): Reference to original quotation (for versions)
- `is_latest_version` (boolean): Whether this is the latest version

### New Indexes
- Index on parent_quotation_id for faster version lookups
- Index on is_latest_version for filtering

## 3. Security Changes
- No RLS changes needed - existing policies apply to all versions

## 4. Notes
- When editing a quotation, a new row is created with incremented version_number
- Project code is automatically updated with version suffix (e.g., "PROJ-001-V2")
- Only the latest version is shown by default in quotation lists
- Version history can be viewed by querying parent_quotation_id
*/

-- Add new columns to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_latest_version boolean DEFAULT true;

-- Create indexes for version management
CREATE INDEX IF NOT EXISTS idx_quotations_parent_id ON quotations(parent_quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotations_latest_version ON quotations(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_quotations_version_number ON quotations(parent_quotation_id, version_number);

-- RPC: Create new quotation version
CREATE OR REPLACE FUNCTION create_new_quotation_version(
  p_quotation_id uuid,
  p_rooms_data jsonb,
  p_devices_data jsonb,
  p_commissioning_price numeric,
  p_installation_price numeric,
  p_total_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_quotation_id uuid;
  v_new_version_number integer;
  v_parent_id uuid;
  v_base_project_code text;
  v_new_project_code text;
  v_quotation quotations%ROWTYPE;
BEGIN
  -- Get current quotation data
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  -- Determine parent ID and new version number
  IF v_quotation.parent_quotation_id IS NULL THEN
    -- This is the original, so it becomes the parent
    v_parent_id := p_quotation_id;
    v_new_version_number := v_quotation.version_number + 1;
  ELSE
    -- This is already a version, use its parent
    v_parent_id := v_quotation.parent_quotation_id;
    v_new_version_number := v_quotation.version_number + 1;
  END IF;

  -- Mark all previous versions as not latest
  UPDATE quotations
  SET is_latest_version = false
  WHERE (id = v_parent_id OR parent_quotation_id = v_parent_id);

  -- Extract base project code (remove any existing version suffix)
  v_base_project_code := REGEXP_REPLACE(v_quotation.project_code, '-V\d+$', '');
  v_new_project_code := v_base_project_code || '-V' || v_new_version_number;

  -- Create new quotation version
  INSERT INTO quotations (
    user_id,
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
    version_number,
    parent_quotation_id,
    is_latest_version,
    client_approval,
    approval_date,
    installation_date,
    warranty_start_date,
    warranty_end_date,
    status,
    is_invoice,
    invoice_number,
    total_paid,
    remaining_balance,
    language,
    is_editable
  ) VALUES (
    v_quotation.user_id,
    v_new_project_code,
    v_quotation.client_name,
    v_quotation.client_address,
    v_quotation.client_phone,
    v_quotation.global_protocol,
    v_quotation.vat_percentage,
    p_rooms_data,
    p_devices_data,
    p_commissioning_price,
    p_installation_price,
    p_total_amount,
    v_new_version_number,
    v_parent_id,
    true,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    'Draft',
    false,
    NULL,
    0,
    p_total_amount,
    v_quotation.language,
    true
  )
  RETURNING id INTO v_new_quotation_id;

  RETURN v_new_quotation_id;
END;
$$;

-- RPC: Get all versions of a quotation
CREATE OR REPLACE FUNCTION get_quotation_versions(p_quotation_id uuid)
RETURNS TABLE (
  id uuid,
  project_code text,
  version_number integer,
  total_amount numeric,
  status text,
  is_latest_version boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  -- Determine the parent ID
  SELECT COALESCE(parent_quotation_id, id)
  INTO v_parent_id
  FROM quotations
  WHERE quotations.id = p_quotation_id;

  -- Return all versions
  RETURN QUERY
  SELECT 
    q.id,
    q.project_code,
    q.version_number,
    q.total_amount,
    q.status,
    q.is_latest_version,
    q.created_at,
    q.updated_at
  FROM quotations q
  WHERE q.id = v_parent_id OR q.parent_quotation_id = v_parent_id
  ORDER BY q.version_number ASC;
END;
$$;