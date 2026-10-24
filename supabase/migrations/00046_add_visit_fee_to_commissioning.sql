-- Add visit_fee column to commissioning_installation table
ALTER TABLE commissioning_installation
ADD COLUMN visit_fee numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN commissioning_installation.visit_fee IS 'Visit fee charged for commissioning services';