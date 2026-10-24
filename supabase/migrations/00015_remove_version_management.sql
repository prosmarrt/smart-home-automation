/*
# Remove Version Management System

## 1. Plain English Explanation
This migration removes the quotation versioning system to create a lightweight, fast-loading application.
The system now operates on a single-version policy with no historical version retention.

## 2. Changes Made

### Dropped Tables
- `quotation_versions`: Removed table that stored historical snapshots of quotations

### Removed Columns from quotations
- `current_version`: No longer tracking version numbers

### Dropped Functions
- `create_quotation_version`: No longer creating version snapshots

### Retained Features
- Client approval workflow (client_approval, approval_date)
- Installation and warranty tracking (installation_date, warranty_start_date, warranty_end_date)
- Payment tracking (payments table remains intact)
- Status management (Draft, Approved, Partially Paid, Fully Paid, Invoiced)
- Invoice conversion (is_invoice, invoice_number)
- Financial calculations (total_paid, remaining_balance)

## 3. Benefits
- Significantly reduced database size
- Improved system performance
- Faster page loading times
- Simplified maintenance
- Reduced server resource consumption
- Cleaner, more intuitive interface

## 4. Notes
- This is a one-way migration - version history is permanently deleted
- All other quotation features remain fully functional
- Payments, approvals, and invoice conversion continue to work as before
*/

-- Drop version-related policies first
DROP POLICY IF EXISTS "Admins can view all versions" ON quotation_versions;
DROP POLICY IF EXISTS "Users can view own quotation versions" ON quotation_versions;
DROP POLICY IF EXISTS "Users can create versions for own quotations" ON quotation_versions;

-- Drop indexes related to versions
DROP INDEX IF EXISTS idx_quotation_versions_quotation_id;
DROP INDEX IF EXISTS idx_quotation_versions_version_number;

-- Drop the quotation_versions table
DROP TABLE IF EXISTS quotation_versions CASCADE;

-- Drop version-related RPC function
DROP FUNCTION IF EXISTS create_quotation_version(uuid);

-- Remove current_version column from quotations table
ALTER TABLE quotations
DROP COLUMN IF EXISTS current_version;

-- Update the calculate_warranty_dates trigger to remove version-related logic
-- (The trigger is already correct, no changes needed)

-- All other features remain intact:
-- - payments table and policies
-- - calculate_quotation_totals function
-- - convert_to_invoice function
-- - approval, installation, warranty, status, and invoice fields
