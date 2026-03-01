CREATE OR REPLACE FUNCTION public.hotel_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_hotels integer;
BEGIN
  SELECT COUNT(*) INTO v_total_hotels FROM public.places;

  RETURN jsonb_build_object(
    'totalHotels', v_total_hotels
  );
END;
$$;
