-- Function to manually mark quotations with pending price updates
-- This helps when price changes need to be applied to existing quotations
CREATE OR REPLACE FUNCTION mark_quotations_for_price_update()
RETURNS TABLE (
  quotation_id uuid,
  project_code text,
  status text,
  marked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can run this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can mark quotations for price updates';
  END IF;

  -- Mark all quotations without payments as pending price update
  UPDATE quotations
  SET 
    pending_price_update = true,
    updated_at = now()
  WHERE 
    status IN ('Draft', 'Approved')
    AND total_paid = 0
    AND update_ignored_at IS NULL
    AND update_applied_at IS NULL
    AND pending_price_update = false;

  -- Return the marked quotations
  RETURN QUERY
  SELECT 
    q.id,
    q.project_code,
    q.status::text,
    q.pending_price_update
  FROM quotations q
  WHERE 
    q.status IN ('Draft', 'Approved')
    AND q.total_paid = 0
    AND q.pending_price_update = true;
END;
$$;

COMMENT ON FUNCTION mark_quotations_for_price_update() IS 'Marks all unpaid quotations (no down payments) as having pending price updates';
