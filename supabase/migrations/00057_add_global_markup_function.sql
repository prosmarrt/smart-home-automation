CREATE OR REPLACE FUNCTION apply_global_markup(markup_percentage numeric, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    price_record RECORD;
BEGIN
    FOR price_record IN SELECT * FROM device_prices LOOP
        INSERT INTO price_history (
            device_price_id,
            device_name,
            device_category,
            old_price,
            new_price,
            change_type,
            change_reason,
            changed_by,
            changed_at
        ) VALUES (
            price_record.id,
            COALESCE(price_record.device_name, (TRIM(COALESCE(price_record.brand, '') || ' ' || COALESCE(price_record.model, ''))), 'Unknown Device'),
            price_record.category,
            price_record.unit_price,
            price_record.unit_price * (1 + markup_percentage / 100),
            'markup',
            'Global markup of ' || markup_percentage || '%',
            user_id,
            now()
        );
    END LOOP;

    UPDATE device_prices
    SET unit_price = unit_price * (1 + markup_percentage / 100),
        updated_at = now();
    
    -- Mark quotations for update
    UPDATE quotations
    SET pending_price_update = true
    WHERE status IN ('Draft', 'Approved')
      AND total_paid = 0
      AND update_ignored_at IS NULL
      AND update_applied_at IS NULL;
END;
$$;
