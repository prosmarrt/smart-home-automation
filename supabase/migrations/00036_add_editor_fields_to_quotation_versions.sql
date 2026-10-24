/*
# Add Editor Fields to Quotation Versions Table

## 1. Plain English Explanation
This migration adds last_edited_by and last_edited_at fields to the quotation_versions table
to track who made changes and when for each version.

## 2. Changes
- Add `last_edited_by` (uuid, nullable): User ID who edited this version
- Add `last_edited_at` (timestamptz, nullable): Timestamp when this version was edited

## 3. Notes
- These fields help track the history of who made changes to quotations
- Nullable to maintain backward compatibility with existing version records
*/

-- Add editor tracking fields to quotation_versions table
ALTER TABLE quotation_versions 
ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- Add index for faster queries on last_edited_by
CREATE INDEX IF NOT EXISTS idx_quotation_versions_last_edited_by ON quotation_versions(last_edited_by);