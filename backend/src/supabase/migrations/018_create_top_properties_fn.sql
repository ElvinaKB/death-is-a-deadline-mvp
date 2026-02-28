CREATE OR REPLACE FUNCTION public.top_properties(p_limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(rows)
  INTO v_result
  FROM (
    SELECT
      p.name        AS "propertyName",
      p.city        AS "city",
      COUNT(b.id)   AS "bookings",
      COALESCE(SUM(b.total_amount), 0) AS "revenue"
    FROM public.bids b
    JOIN public.places p ON b.place_id = p.id
    WHERE b.status = 'ACCEPTED'
    GROUP BY p.id, p.name, p.city
    ORDER BY "revenue" DESC
    LIMIT p_limit
  ) rows;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
