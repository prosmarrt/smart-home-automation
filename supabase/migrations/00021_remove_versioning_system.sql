/*
# Remove Quotation Versioning System

## 1. Plain English Explanation
This migration completely removes the quotation versioning system to simplify the application.
The system will now work with single quotations without version tracking.

## 2. Changes Made

### Removed Columns from quotations
- `version_number`: No longer tracking version numbers
- `parent_quotation_id`: No longer tracking parent-child relationships
- `is_latest_version`: No longer needed

### Dropped Functions
- `create_new_quotation_version`: No longer creating version snapshots

### Dropped Indexes
- `idx_quotations_parent_id`: Index on parent_quotation_id
- `idx_quotations_latest_version`: Index on is_latest_version
- `idx_quotations_version_number`: Index on version tracking

## 3. Benefits
- Simplified codebase
- Improved performance
- Easier maintenance
- Better user experience

## 4. Notes
- All quotations remain intact
- Only version-tracking metadata is removed
- All other features (payments, invoices, etc.) continue to work
*/

-- Drop indexes first
DROP INDEX IF EXISTS idx_quotations_parent_id;
DROP INDEX IF EXISTS idx_quotations_latest_version;
DROP INDEX IF EXISTS idx_quotations_version_number;

-- Drop RPC function
DROP FUNCTION IF EXISTS create_new_quotation_version(uuid, jsonb, jsonb, numeric, numeric, numeric);

-- Remove columns from quotations table
ALTER TABLE quotations
DROP COLUMN IF EXISTS version_number,
DROP COLUMN IF EXISTS parent_quotation_id,
DROP COLUMN IF EXISTS is_latest_version;
