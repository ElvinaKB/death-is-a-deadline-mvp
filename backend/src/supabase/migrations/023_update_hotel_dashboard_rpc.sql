DROP FUNCTION IF EXISTS public.hotel_earnings_stats(text);
DROP FUNCTION IF EXISTS public.hotel_booking_stats(text);
DROP FUNCTION IF EXISTS public.hotel_property_stats(text);
DROP FUNCTION IF EXISTS public.hotel_property_breakdown(text);

-- ============================================================
-- hotel_earnings_stats(p_place_id text)
-- ============================================================
CREATE FUNCTION public.hotel_earnings_stats(p_place_id text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_build_object(
  'totalRevenue',  COALESCE(SUM(b.total_amount), 0),
  'totalPayable',  COALESCE(SUM(b.payable_to_hotel), 0),
  'totalPaidOut',  COALESCE(SUM(CASE WHEN b.is_paid_to_hotel = true  THEN b.payable_to_hotel ELSE 0 END), 0),
  'totalPending',  COALESCE(SUM(CASE WHEN b.is_paid_to_hotel = false THEN b.payable_to_hotel ELSE 0 END), 0)
)
FROM public.bids b
INNER JOIN public.payments pay ON pay.bid_id = b.id
WHERE b.place_id = p_place_id
  AND b.status   = 'ACCEPTED'
  AND pay.status = 'CAPTURED';
$$;

-- ============================================================
-- hotel_booking_stats(p_place_id text)
-- ============================================================
CREATE FUNCTION public.hotel_booking_stats(p_place_id text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_build_object(
  'totalConfirmed', COALESCE((
    SELECT COUNT(*)
    FROM public.bids b
    INNER JOIN public.payments pay ON pay.bid_id = b.id
    WHERE b.place_id = p_place_id
      AND b.status   = 'ACCEPTED'
      AND pay.status = 'CAPTURED'
  ), 0),
  'totalPendingBids', COALESCE((
    SELECT COUNT(*)
    FROM public.bids b
    WHERE b.place_id = p_place_id
      AND b.status   = 'PENDING'
  ), 0),
  'totalRejected', COALESCE((
    SELECT COUNT(*)
    FROM public.bids b
    WHERE b.place_id = p_place_id
      AND b.status   = 'REJECTED'
  ), 0),
  'totalNightsBooked', COALESCE((
    SELECT SUM(b.total_nights)
    FROM public.bids b
    INNER JOIN public.payments pay ON pay.bid_id = b.id
    WHERE b.place_id = p_place_id
      AND b.status   = 'ACCEPTED'
      AND pay.status = 'CAPTURED'
  ), 0)
);
$$;

-- ============================================================
-- hotel_property_stats(p_place_id text)
-- ============================================================
CREATE FUNCTION public.hotel_property_stats(p_place_id text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_build_object(
  'totalProperties', 1,
  'liveProperties',  COALESCE(SUM(CASE WHEN status = 'LIVE' THEN 1 ELSE 0 END), 0)
)
FROM public.places
WHERE id = p_place_id;
$$;

-- ============================================================
-- hotel_property_breakdown(p_place_id text)
-- ============================================================
CREATE FUNCTION public.hotel_property_breakdown(p_place_id text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT COALESCE(
  json_agg(
    json_build_object(
      'propertyName',       pl.name,
      'city',               pl.city,
      'confirmedBookings',  COALESCE(confirmed.cnt,     0),
      'pendingBookings',    COALESCE(pending.cnt,       0),
      'totalNights',        COALESCE(confirmed.nights,  0),
      'revenue',            COALESCE(confirmed.revenue, 0),
      'payableToHotel',     COALESCE(confirmed.payable, 0)
    )
    ORDER BY confirmed.revenue DESC NULLS LAST
  ),
  '[]'::json
)
FROM public.places pl
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                          AS cnt,
    COALESCE(SUM(b.total_nights),     0) AS nights,
    COALESCE(SUM(b.total_amount),     0) AS revenue,
    COALESCE(SUM(b.payable_to_hotel), 0) AS payable
  FROM public.bids b
  INNER JOIN public.payments pay ON pay.bid_id = b.id
  WHERE b.place_id = pl.id
    AND b.status   = 'ACCEPTED'
    AND pay.status = 'CAPTURED'
) confirmed ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM public.bids b
  WHERE b.place_id = pl.id
    AND b.status   = 'PENDING'
) pending ON true
WHERE pl.id = p_place_id;
$$;