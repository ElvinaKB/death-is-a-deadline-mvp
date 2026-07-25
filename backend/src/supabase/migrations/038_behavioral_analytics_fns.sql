-- Migration: behavioral analytics functions (per-traveler + global).
--
-- Deadline's proprietary dataset: every bid — won, rejected, or abandoned —
-- is already stored in public.bids. These functions surface the behavioral
-- signals (discount vs retail, attempts, lead time, conversion, abandonment,
-- destinations, bid time-of-day) per traveler and in aggregate. Hour/day
-- buckets use America/Los_Angeles wall time (our market's timezone).

-- ── Per-traveler behavior ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.traveler_behavior(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total       integer;
  v_bookings    integer;
  v_rejected    integer;
  v_cancelled   integer;
  v_avg_bid     numeric;
  v_min_bid     numeric;
  v_max_bid     numeric;
  v_avg_disc    numeric;
  v_avg_lead    numeric;
  v_repeat      integer;
  v_top_cities  jsonb;
  v_hours       jsonb;
  v_dows        jsonb;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE b.status = 'ACCEPTED'),
    COUNT(*) FILTER (WHERE b.status = 'REJECTED'),
    COUNT(*) FILTER (WHERE b.status = 'CANCELLED'),
    ROUND(AVG(b.bid_per_night), 2),
    MIN(b.bid_per_night),
    MAX(b.bid_per_night),
    ROUND(AVG((p."retailPrice" - b.bid_per_night) / NULLIF(p."retailPrice", 0) * 100)
          FILTER (WHERE p."retailPrice" > 0), 1),
    ROUND(AVG(b.check_in_date - b.created_at::date), 1)
  INTO v_total, v_bookings, v_rejected, v_cancelled,
       v_avg_bid, v_min_bid, v_max_bid, v_avg_disc, v_avg_lead
  FROM public.bids b
  JOIN public.places p ON p.id = b.place_id
  WHERE b.student_id = p_student_id;

  -- Repeat hotels: places this traveler bid on more than once.
  SELECT COUNT(*) INTO v_repeat FROM (
    SELECT b.place_id FROM public.bids b
    WHERE b.student_id = p_student_id
    GROUP BY b.place_id HAVING COUNT(*) > 1
  ) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_cities FROM (
    SELECT p.city AS city, COUNT(*) AS cnt
    FROM public.bids b JOIN public.places p ON p.id = b.place_id
    WHERE b.student_id = p_student_id
    GROUP BY p.city ORDER BY cnt DESC LIMIT 5
  ) c;

  -- 24-bucket hour-of-day histogram (local wall time), all buckets present.
  SELECT COALESCE(jsonb_agg(cnt ORDER BY h), '[]'::jsonb) INTO v_hours FROM (
    SELECT g.h, COUNT(b.id) AS cnt
    FROM generate_series(0, 23) AS g(h)
    LEFT JOIN public.bids b ON b.student_id = p_student_id
      AND EXTRACT(HOUR FROM b.created_at AT TIME ZONE 'America/Los_Angeles') = g.h
    GROUP BY g.h ORDER BY g.h
  ) hh;

  -- 7-bucket day-of-week histogram (0 = Sunday).
  SELECT COALESCE(jsonb_agg(cnt ORDER BY d), '[]'::jsonb) INTO v_dows FROM (
    SELECT g.d, COUNT(b.id) AS cnt
    FROM generate_series(0, 6) AS g(d)
    LEFT JOIN public.bids b ON b.student_id = p_student_id
      AND EXTRACT(DOW FROM b.created_at AT TIME ZONE 'America/Los_Angeles') = g.d
    GROUP BY g.d ORDER BY g.d
  ) dd;

  RETURN jsonb_build_object(
    'totalBids',         COALESCE(v_total, 0),
    'bookings',          COALESCE(v_bookings, 0),
    'rejected',          COALESCE(v_rejected, 0),
    'cancelled',         COALESCE(v_cancelled, 0),
    'conversionRate',    CASE WHEN COALESCE(v_total, 0) > 0
                              THEN ROUND(v_bookings::numeric / v_total * 100, 1) ELSE 0 END,
    'avgBid',            COALESCE(v_avg_bid, 0),
    'minBid',            COALESCE(v_min_bid, 0),
    'maxBid',            COALESCE(v_max_bid, 0),
    'avgDiscountPct',    COALESCE(v_avg_disc, 0),
    'avgLeadDays',       COALESCE(v_avg_lead, 0),
    'avgBidsPerBooking', CASE WHEN COALESCE(v_bookings, 0) > 0
                              THEN ROUND(v_total::numeric / v_bookings, 1) ELSE NULL END,
    'repeatHotels',      COALESCE(v_repeat, 0),
    'abandoned',         (COALESCE(v_total, 0) > 0 AND COALESCE(v_bookings, 0) = 0),
    'topCities',         v_top_cities,
    'hourHistogram',     v_hours,
    'dowHistogram',      v_dows
  );
END;
$$;

-- ── Global aggregate behavior ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.behavior_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total      integer;
  v_bookings   integer;
  v_avg_disc   numeric;
  v_avg_lead   numeric;
  v_bidders    integer;
  v_bookers    integer;
  v_top_cities jsonb;
  v_hours      jsonb;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE b.status = 'ACCEPTED'),
    ROUND(AVG((p."retailPrice" - b.bid_per_night) / NULLIF(p."retailPrice", 0) * 100)
          FILTER (WHERE p."retailPrice" > 0), 1),
    ROUND(AVG(b.check_in_date - b.created_at::date), 1)
  INTO v_total, v_bookings, v_avg_disc, v_avg_lead
  FROM public.bids b
  JOIN public.places p ON p.id = b.place_id;

  SELECT COUNT(DISTINCT student_id) INTO v_bidders FROM public.bids;
  SELECT COUNT(DISTINCT student_id) INTO v_bookers FROM public.bids WHERE status = 'ACCEPTED';

  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_cities FROM (
    SELECT p.city AS city, COUNT(*) AS cnt
    FROM public.bids b JOIN public.places p ON p.id = b.place_id
    GROUP BY p.city ORDER BY cnt DESC LIMIT 8
  ) c;

  SELECT COALESCE(jsonb_agg(cnt ORDER BY h), '[]'::jsonb) INTO v_hours FROM (
    SELECT g.h, COUNT(b.id) AS cnt
    FROM generate_series(0, 23) AS g(h)
    LEFT JOIN public.bids b
      ON EXTRACT(HOUR FROM b.created_at AT TIME ZONE 'America/Los_Angeles') = g.h
    GROUP BY g.h ORDER BY g.h
  ) hh;

  RETURN jsonb_build_object(
    'totalBids',         COALESCE(v_total, 0),
    'totalBookings',     COALESCE(v_bookings, 0),
    'conversionRate',    CASE WHEN COALESCE(v_total, 0) > 0
                              THEN ROUND(v_bookings::numeric / v_total * 100, 1) ELSE 0 END,
    'avgDiscountPct',    COALESCE(v_avg_disc, 0),
    'avgLeadDays',       COALESCE(v_avg_lead, 0),
    'avgBidsPerBooking', CASE WHEN COALESCE(v_bookings, 0) > 0
                              THEN ROUND(v_total::numeric / v_bookings, 1) ELSE NULL END,
    'uniqueBidders',     COALESCE(v_bidders, 0),
    'uniqueBookers',     COALESCE(v_bookers, 0),
    'abandonmentRate',   CASE WHEN COALESCE(v_bidders, 0) > 0
                              THEN ROUND((v_bidders - v_bookers)::numeric / v_bidders * 100, 1) ELSE 0 END,
    'topCities',         v_top_cities,
    'hourHistogram',     v_hours
  );
END;
$$;
