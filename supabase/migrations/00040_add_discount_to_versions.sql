ALTER TABLE quotation_versions
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0 CHECK (discount_value >= 0);

COMMENT ON COLUMN quotation_versions.discount_type IS 'Type of discount: percentage or fixed amount';
COMMENT ON COLUMN quotation_versions.discount_value IS 'Discount value (percentage or fixed amount)';