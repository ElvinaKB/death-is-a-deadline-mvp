CREATE OR REPLACE FUNCTION public.bid_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bookings integer;
  v_total_revenue numeric;
  v_platform_commission numeric;
  v_total_paid_to_hotels numeric;
  v_total_nights_booked integer;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(platform_commission), 0),
    COALESCE(SUM(payable_to_hotel) FILTER (WHERE is_paid_to_hotel = true), 0),
    COALESCE(SUM(total_nights), 0)
  INTO
    v_total_bookings,
    v_total_revenue,
    v_platform_commission,
    v_total_paid_to_hotels,
    v_total_nights_booked
  FROM public.bids
  WHERE status = 'ACCEPTED';

  RETURN jsonb_build_object(
    'totalBookings',       v_total_bookings,
    'totalRevenue',        v_total_revenue,
    'platformCommission',  v_platform_commission,
    'totalPaidToHotels',   v_total_paid_to_hotels,
    'totalNightsBooked',   v_total_nights_booked
  );
END;
$$;
