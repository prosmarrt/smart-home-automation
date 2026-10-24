-- Add visit_price column to quotations table
ALTER TABLE quotations
ADD COLUMN visit_price numeric DEFAULT 0;

COMMENT ON COLUMN quotations.visit_price IS 'Visit fee charged for commissioning services';

-- Also add to quotation_versions table for version history
ALTER TABLE quotation_versions
ADD COLUMN visit_price numeric DEFAULT 0;

COMMENT ON COLUMN quotation_versions.visit_price IS 'Visit fee charged for commissioning services (version history)';