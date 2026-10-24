/*
# Add VAT to Commissioning & Installation

## Purpose
Add VAT percentage field to commissioning_installation table to allow VAT calculation on the total quotation.

## Changes
- Add `vat_percentage` column (numeric, default 0, range 0-100)

## Notes
- VAT is applied to the grand total (devices + commissioning + installation)
- Default is 0% as per requirements
*/

ALTER TABLE commissioning_installation
ADD COLUMN IF NOT EXISTS vat_percentage numeric DEFAULT 0 NOT NULL CHECK (vat_percentage >= 0 AND vat_percentage <= 100);