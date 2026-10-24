-- Drop the old status check constraint that only allowed 5 values
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Add the updated constraint that includes Pipeline and Declined
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check
  CHECK (status = ANY (ARRAY[
    'Draft'::text,
    'Approved'::text,
    'Pipeline'::text,
    'Declined'::text,
    'Partially Paid'::text,
    'Fully Paid'::text,
    'Invoiced'::text
  ]));