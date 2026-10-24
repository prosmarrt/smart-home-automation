-- Add discount fields to commissioning_installation table
ALTER TABLE commissioning_installation
ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN discount_value NUMERIC DEFAULT 0 CHECK (discount_value >= 0);

-- Add discount fields to quotations table
ALTER TABLE quotations
ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN discount_value NUMERIC DEFAULT 0 CHECK (discount_value >= 0);

-- Add comment for clarity
COMMENT ON COLUMN commissioning_installation.discount_type IS 'Type of discount: percentage or fixed amount';
COMMENT ON COLUMN commissioning_installation.discount_value IS 'Discount value (percentage or fixed amount)';
COMMENT ON COLUMN quotations.discount_type IS 'Type of discount: percentage or fixed amount';
COMMENT ON COLUMN quotations.discount_value IS 'Discount value (percentage or fixed amount)';