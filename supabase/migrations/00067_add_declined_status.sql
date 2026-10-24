-- No enum to alter — status is plain text. Just document valid values via a check constraint.
-- Add a comment to the quotation_status_audit table for the new Declined value.
COMMENT ON TABLE quotation_status_audit IS 'Audit trail for quotation status changes. Valid statuses: Draft, Approved, Pipeline, Declined, Invoiced, Partially Paid, Fully Paid';