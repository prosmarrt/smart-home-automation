/*
# Add Pricing Fields to Devices Table

## 1. Plain English Explanation
This migration adds pricing functionality to the smart home automation system.
It adds a unit_price field to the devices table to store the price per device unit,
and a vat_rate field to store the VAT/tax rate for quotation calculations.

## 2. Table Modifications

### devices table additions
- `unit_price` (numeric, default 0): Price per single unit of the device
- `vat_rate` (numeric, default 0): VAT/tax rate as a percentage (e.g., 15 for 15%)

## 3. Security Changes
- No security changes - maintains existing public access model

## 4. Notes
- Prices stored as numeric type for precision
- VAT rate stored as percentage value
- Default values set to 0 to maintain backward compatibility
*/

-- Add pricing columns to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0 CHECK (unit_price >= 0),
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0 CHECK (vat_rate >= 0 AND vat_rate <= 100);