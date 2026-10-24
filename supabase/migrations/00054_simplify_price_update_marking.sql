-- Drop the old function
DROP FUNCTION IF EXISTS mark_quotations_for_price_update();

-- Create a simpler function that just marks all unpaid quotations
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
DECLARE
  updated_count integer;
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
    AND (update_ignored_at IS NULL OR update_applied_at IS NULL);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Marked % quotations for price update', updated_count;

  -- Return all quotations that now have pending updates
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
    AND q.pending_price_update = true
  ORDER BY q.created_at DESC;
END;
$$;

COMMENT ON FUNCTION mark_quotations_for_price_update() IS 'Marks all unpaid quotations (no down payments) as having pending price updates. Admin only.';
