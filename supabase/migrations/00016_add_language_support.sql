/*
# Add Language Support to Quotations

1. Changes to quotations table
   - Add `language` column (text, default: 'en', values: 'en' or 'ar')
   - Add `is_editable` column (boolean, default: true) to control edit permissions

2. Purpose
   - Enable bilingual quotations (English and Arabic)
   - Allow users to create quotations in either language
   - Allow converting quotations between languages
   - Control whether quotations can be edited (invoices cannot be edited)

3. Notes
   - Language field will be used to determine UI language and PDF export language
   - is_editable will be set to false when quotation is converted to invoice
*/

-- Add language column to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en' CHECK (language IN ('en', 'ar'));

-- Add is_editable column to control edit permissions
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS is_editable boolean DEFAULT true;

-- Update existing quotations to be editable and in English
UPDATE quotations SET language = 'en', is_editable = true WHERE language IS NULL;

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_quotations_language ON quotations(language);
CREATE INDEX IF NOT EXISTS idx_quotations_is_editable ON quotations(is_editable);
