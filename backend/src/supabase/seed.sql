-- ================================================================
-- SEED: education-bidding — temp test data
-- Delete: uncomment cleanup section at bottom, or run:
--   DELETE FROM auth.users WHERE id LIKE 'a0000000-%';
--   DELETE FROM public.places WHERE "id" LIKE 'cccc0000-%';
-- Password for all users: Test@1234
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ================================================================
-- 1. AUTH USERS
-- ================================================================
-- All IDs start with a0000000 for easy bulk cleanup.
-- Roles: ADMIN | STUDENT | HOTEL_OWNER (stored in auth.users.role).
-- Student metadata: name, approvalStatus, studentIdUrl.

DO $$
DECLARE
  pw text := crypt('Test@1234', gen_salt('bf'));
BEGIN

  -- Admin --------------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'ADMIN', 'admin@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alex Rivera"}',
    NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Student 1: Alice — APPROVED, has bids -----------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'STUDENT', 'alice@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alice Johnson","approvalStatus":"APPROVED","studentIdUrl":"https://picsum.photos/seed/alice-id-card/400/300"}',
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Student 2: Bob — APPROVED, has bids -------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'STUDENT', 'bob@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Bob Martinez","approvalStatus":"APPROVED","studentIdUrl":"https://picsum.photos/seed/bob-id-card/400/300"}',
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Student 3: Charlie — PENDING (awaiting ID review) -----------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000004',
    'authenticated', 'STUDENT', 'charlie@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Charlie Kim","approvalStatus":"PENDING","studentIdUrl":"https://picsum.photos/seed/charlie-id-card/400/300"}',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Student 4: Diana — REJECTED ---------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000005',
    'authenticated', 'STUDENT', 'diana@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Diana Patel","approvalStatus":"REJECTED","rejectionReason":"ID document could not be verified — please resubmit a clearer photo.","studentIdUrl":"https://picsum.photos/seed/diana-id-card/400/300"}',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Hotel Owner: Sam --------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000006',
    'authenticated', 'HOTEL_OWNER', 'owner@test.com', pw, NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sam Cooper","approvalStatus":"APPROVED"}',
    NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'
  ) ON CONFLICT (id) DO NOTHING;

END $$;

-- Auth identities (required for sign-in to work)
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'admin@test.com',   'a0000000-0000-0000-0000-000000000001',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'alice@test.com',   'a0000000-0000-0000-0000-000000000002',
   '{"sub":"a0000000-0000-0000-0000-000000000002","email":"alice@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'bob@test.com',     'a0000000-0000-0000-0000-000000000003',
   '{"sub":"a0000000-0000-0000-0000-000000000003","email":"bob@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'charlie@test.com', 'a0000000-0000-0000-0000-000000000004',
   '{"sub":"a0000000-0000-0000-0000-000000000004","email":"charlie@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'diana@test.com',   'a0000000-0000-0000-0000-000000000005',
   '{"sub":"a0000000-0000-0000-0000-000000000005","email":"diana@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'owner@test.com',   'a0000000-0000-0000-0000-000000000006',
   '{"sub":"a0000000-0000-0000-0000-000000000006","email":"owner@test.com","email_verified":true,"phone_verified":false}',
   'email', NOW(), NOW(), NOW())
ON CONFLICT (provider_id, provider) DO NOTHING;


-- ================================================================
-- 2. PLACES
-- ================================================================
-- All IDs are valid UUIDs. First group 'cccc0000' = places namespace.
-- Images from picsum.photos — consistent per seed word, no API key needed.

INSERT INTO public.places (
  "id", "name", "shortDescription", "fullDescription",
  "city", "country", "address", "accommodationType",
  "retailPrice", "minimumBid", "autoAcceptAboveMinimum",
  "blackoutDates", allowed_days_of_week, max_inventory,
  "status", "createdAt", "updatedAt"
) VALUES

  -- 1: The Pearl Hotel — Manhattan, LIVE
  (
    'cccc0000-0000-0000-0000-000000000001',
    'The Pearl Hotel',
    'Upscale boutique hotel steps from the Brooklyn Bridge.',
    'Tucked between the Financial District and SoHo, The Pearl Hotel puts you within walking distance of iconic landmarks, rooftop dining, and world-class shopping. Each room comes with floor-to-ceiling windows, Egyptian cotton bedding, and a rain shower that turns your morning into an event. The in-house bar stocks 40 whiskeys and stays open until 2 AM. Concierge books restaurant tables that are otherwise impossible to get.',
    'New York', 'United States', '123 Pearl Street, Manhattan, NY 10004',
    'HOTEL', 189.00, 95.00, true,
    ARRAY[]::TEXT[], ARRAY[0,1,2,3,4,5,6], 10,
    'LIVE', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'
  ),

  -- 2: Backpacker's Haven — Hollywood, LIVE
  (
    'cccc0000-0000-0000-0000-000000000002',
    'Backpacker''s Haven',
    'Social hostel with a rooftop terrace and free breakfast.',
    'Backpacker''s Haven is where solo travelers stop being solo. The rooftop terrace hosts weekly barbecues, the common room runs movie nights every Friday, and the location — one block from Hollywood Boulevard — puts adventure right outside the door. Free breakfast every morning, free city maps at the front desk, and a staff that knows every hidden bar in Los Angeles. Dorms sleep four, six, or eight. Private rooms available on request.',
    'Los Angeles', 'United States', '456 Sunset Blvd, Hollywood, CA 90028',
    'HOSTEL', 55.00, 28.00, true,
    ARRAY[]::TEXT[], ARRAY[0,1,2,3,4,5,6], 30,
    'LIVE', NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days'
  ),

  -- 3: Sunset Motel Miami — Miami Beach, LIVE
  (
    'cccc0000-0000-0000-0000-000000000003',
    'Sunset Motel Miami',
    'Breezy beachfront motel with free parking and a midnight pool.',
    'Forget rushing through lobbies. At Sunset Motel, you park outside your door, toss your bags in, and you''re at the beach in four minutes flat. The outdoor pool stays open until midnight, the tiki bar starts pouring at noon, and every room comes stocked with thick robes and blackout curtains for mornings when the ocean can wait. Complimentary beach towels at check-in. Free parking every night.',
    'Miami', 'United States', '789 Ocean Drive, Miami Beach, FL 33139',
    'MOTEL', 98.00, 49.00, true,
    ARRAY[]::TEXT[], ARRAY[0,1,2,3,4,5,6], 20,
    'LIVE', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'
  ),

  -- 4: City Center Hotel Chicago — DRAFT (not yet live)
  (
    'cccc0000-0000-0000-0000-000000000004',
    'City Center Hotel Chicago',
    'Contemporary hotel one stop from Millennium Park.',
    'City Center Hotel sits at the exact midpoint of everything Chicago does best. Millennium Park is an eight-minute walk, the Art Institute is twelve, and the best deep-dish in the city is on the same block. Rooms are wide, beds are firm, and the lobby coffee bar opens at 5 AM for early risers who want to catch the sunrise over Lake Michigan. Business center, same-day laundry, and a fitness room on the 12th floor.',
    'Chicago', 'United States', '321 N Michigan Ave, Chicago, IL 60601',
    'HOTEL', 145.00, 72.00, false,
    ARRAY[]::TEXT[], ARRAY[1,2,3,4,5], 15,
    'DRAFT', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'
  )

ON CONFLICT ("id") DO NOTHING;


-- ================================================================
-- 3. PLACE IMAGES
-- ================================================================
-- picsum.photos/seed/<word>/800/600 — stable, no API key required.

-- Image IDs: first group 'dddd0000' = images namespace.
INSERT INTO public.place_images ("id", "url", "order", "placeId") VALUES

  -- The Pearl Hotel
  ('dddd0000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/pearl-hotel-pool/800/600',    0, 'cccc0000-0000-0000-0000-000000000001'),
  ('dddd0000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/pearl-hotel-room/800/600',    1, 'cccc0000-0000-0000-0000-000000000001'),
  ('dddd0000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/pearl-hotel-lobby/800/600',   2, 'cccc0000-0000-0000-0000-000000000001'),

  -- Backpacker's Haven
  ('dddd0000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/backpackers-dorm/800/600',    0, 'cccc0000-0000-0000-0000-000000000002'),
  ('dddd0000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/backpackers-roof/800/600',    1, 'cccc0000-0000-0000-0000-000000000002'),
  ('dddd0000-0000-0000-0000-000000000006', 'https://picsum.photos/seed/backpackers-common/800/600',  2, 'cccc0000-0000-0000-0000-000000000002'),

  -- Sunset Motel Miami
  ('dddd0000-0000-0000-0000-000000000007', 'https://picsum.photos/seed/sunset-motel-pool/800/600',   0, 'cccc0000-0000-0000-0000-000000000003'),
  ('dddd0000-0000-0000-0000-000000000008', 'https://picsum.photos/seed/sunset-motel-room/800/600',   1, 'cccc0000-0000-0000-0000-000000000003'),
  ('dddd0000-0000-0000-0000-000000000009', 'https://picsum.photos/seed/sunset-motel-beach/800/600',  2, 'cccc0000-0000-0000-0000-000000000003'),

  -- City Center Hotel Chicago
  ('dddd0000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/chicago-hotel-exterior/800/600', 0, 'cccc0000-0000-0000-0000-000000000004'),
  ('dddd0000-0000-0000-0000-000000000011', 'https://picsum.photos/seed/chicago-hotel-room/800/600',     1, 'cccc0000-0000-0000-0000-000000000004')

ON CONFLICT ("id") DO NOTHING;


-- ================================================================
-- 4. TESTIMONIALS
-- ================================================================

INSERT INTO public.testimonials (id, place_id, rating, title, content, author, author_role)
VALUES
  -- The Pearl Hotel
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000001', 5,
    'Best stay I have had in Manhattan',
    'Woke up to a view of the Brooklyn Bridge and checked out feeling like a local. The staff knew my name by day two and the concierge got us into a restaurant that had been booked solid for six weeks.',
    'Priya Sharma', 'Graduate Student'
  ),
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000001', 4,
    'Worth every penny for a conference trip',
    'Quiet, spotless, and the breakfast spread was genuinely impressive. Location cut my commute to the Javits Center down to ten minutes. Will book again next year.',
    'Liam O''Brien', 'PhD Candidate'
  ),

  -- Backpacker's Haven
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000002', 5,
    'Met my best travel friends here',
    'The rooftop barbecue on my first night turned into a five-hour conversation with people from eight different countries. The community is real. Staff recommended a taco truck I still dream about three months later.',
    'Sofia Reyes', 'Exchange Student'
  ),
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000002', 4,
    'Clean, social, and the location cannot be beaten',
    'Beds are comfortable, showers run hot, and the free breakfast kept me going through long days of sightseeing. The common room had a decent book swap and someone always knew which beach was quieter that day.',
    'James Park', 'Undergraduate Student'
  ),

  -- Sunset Motel Miami
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000003', 5,
    'Exactly what a beach motel should be',
    'Checked in at 3 PM and was in the ocean by 3:10. The tiki bar kept things lively and the beds were actually great. No fuss, no lobby performance — just the beach and a cold drink.',
    'Maria Lopez', 'Law Student'
  ),
  (
    gen_random_uuid(),
    'cccc0000-0000-0000-0000-000000000003', 4,
    'Perfect for a long weekend after finals',
    'No frills, no drama. Parked outside my room, walked three blocks to the sand, slept better than I have in months. The midnight pool was the deciding factor and it delivered.',
    'Tom Nguyen', 'Medical Student'
  );


-- ================================================================
-- 5. REVIEW PLATFORMS
-- ================================================================

INSERT INTO public.review_platforms (place_id, name, rating, review_count, url, source)
VALUES
  ('cccc0000-0000-0000-0000-000000000001',       'The Pearl Hotel',      4.70, 1842, 'https://www.google.com/search?q=the+pearl+hotel+nyc',        'google'),
  ('cccc0000-0000-0000-0000-000000000001',       'The Pearl Hotel',      4.50,  623, 'https://www.yelp.com/biz/the-pearl-hotel-new-york',           'yelp'),
  ('cccc0000-0000-0000-0000-000000000002',  'Backpacker''s Haven',  4.80, 3201, 'https://www.google.com/search?q=backpackers+haven+hollywood', 'google'),
  ('cccc0000-0000-0000-0000-000000000002',  'Backpacker''s Haven',  4.60,  980, 'https://www.yelp.com/biz/backpackers-haven-los-angeles',      'yelp'),
  ('cccc0000-0000-0000-0000-000000000003',    'Sunset Motel Miami',   4.30, 2115, 'https://www.google.com/search?q=sunset+motel+miami+beach',    'google'),
  ('cccc0000-0000-0000-0000-000000000003',    'Sunset Motel Miami',   4.10,  740, 'https://www.yelp.com/biz/sunset-motel-miami-beach',           'yelp'),
  ('cccc0000-0000-0000-0000-000000000004', 'City Center Hotel',    4.50,  967, 'https://www.google.com/search?q=city+center+hotel+chicago',   'google'),
  ('cccc0000-0000-0000-0000-000000000004', 'City Center Hotel',    4.20,  312, 'https://www.yelp.com/biz/city-center-hotel-chicago',          'yelp')
ON CONFLICT (place_id, source) DO NOTHING;


-- ================================================================
-- 6. BIDS
-- ================================================================
-- platform_commission = 6.66% of total_amount
-- payable_to_hotel    = total_amount - platform_commission

INSERT INTO public.bids (
  id, place_id, student_id,
  check_in_date, check_out_date,
  bid_per_night, total_nights, total_amount,
  platform_commission, payable_to_hotel,
  status, rejection_reason,
  created_at, updated_at
) VALUES

  -- Alice: PENDING — Pearl Hotel (under review)
  (
    'b0000000-0000-0000-0000-000000000001',
    'cccc0000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    '2026-06-01', '2026-06-04',
    110.00, 3, 330.00,
    NULL, NULL,
    'PENDING', NULL,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),

  -- Alice: ACCEPTED — Backpacker's Haven (payment captured)
  (
    'b0000000-0000-0000-0000-000000000002',
    'cccc0000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '2026-05-20', '2026-05-25',
    35.00, 5, 175.00,
    ROUND(175.00 * 0.0666, 2),
    ROUND(175.00 - ROUND(175.00 * 0.0666, 2), 2),
    'ACCEPTED', NULL,
    NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'
  ),

  -- Alice: REJECTED — Sunset Motel (too low for peak season)
  (
    'b0000000-0000-0000-0000-000000000003',
    'cccc0000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    '2026-07-10', '2026-07-14',
    42.00, 4, 168.00,
    NULL, NULL,
    'REJECTED', 'Bid is below the minimum accepted rate for peak summer season.',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'
  ),

  -- Bob: ACCEPTED — Pearl Hotel (payment authorized, awaiting capture)
  (
    'b0000000-0000-0000-0000-000000000004',
    'cccc0000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    '2026-06-15', '2026-06-18',
    120.00, 3, 360.00,
    ROUND(360.00 * 0.0666, 2),
    ROUND(360.00 - ROUND(360.00 * 0.0666, 2), 2),
    'ACCEPTED', NULL,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'
  ),

  -- Bob: PENDING — Sunset Motel (just submitted)
  (
    'b0000000-0000-0000-0000-000000000005',
    'cccc0000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    '2026-08-01', '2026-08-05',
    55.00, 4, 220.00,
    NULL, NULL,
    'PENDING', NULL,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  )

ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- 7. PAYMENTS
-- ================================================================

INSERT INTO public.payments (
  id, bid_id, student_id,
  amount, currency, status,
  stripe_payment_intent_id, stripe_payment_method_id,
  authorized_at, captured_at, expires_at,
  created_at, updated_at
) VALUES

  -- Alice's ACCEPTED bid — CAPTURED (funds charged)
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    175.00, 'usd', 'CAPTURED',
    'pi_seed_alice_captured_001', 'pm_seed_alice_001',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '8 days',
    NOW() + INTERVAL '6 days',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'
  ),

  -- Bob's ACCEPTED bid — AUTHORIZED (funds held, admin yet to capture)
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000003',
    360.00, 'usd', 'AUTHORIZED',
    'pi_seed_bob_authorized_001', 'pm_seed_bob_001',
    NOW() - INTERVAL '3 days',
    NULL,
    NOW() + INTERVAL '4 days',
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'
  )

ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- SEED SUMMARY
-- ================================================================
--
-- USERS (password: Test@1234)
--   admin@test.com   — ADMIN
--   alice@test.com   — STUDENT, APPROVED
--   bob@test.com     — STUDENT, APPROVED
--   charlie@test.com — STUDENT, PENDING
--   diana@test.com   — STUDENT, REJECTED
--   owner@test.com   — HOTEL_OWNER, APPROVED
--
-- PLACES
--   The Pearl Hotel          (HOTEL,  LIVE,  New York)
--   Backpacker's Haven       (HOSTEL, LIVE,  Los Angeles)
--   Sunset Motel Miami       (MOTEL,  LIVE,  Miami)
--   City Center Hotel Chicago(HOTEL,  DRAFT, Chicago)
--
-- BIDS
--   Alice → Pearl Hotel       PENDING
--   Alice → Backpacker's Haven ACCEPTED  (payment CAPTURED)
--   Alice → Sunset Motel      REJECTED
--   Bob   → Pearl Hotel       ACCEPTED   (payment AUTHORIZED)
--   Bob   → Sunset Motel      PENDING
--
-- ================================================================
-- CLEANUP (uncomment to wipe all seed data)
-- ================================================================
/*

DELETE FROM public.payments
WHERE id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);

DELETE FROM public.bids
WHERE id IN (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000005'
);

DELETE FROM public.review_platforms WHERE place_id LIKE 'cccc0000-%';
DELETE FROM public.testimonials      WHERE place_id LIKE 'cccc0000-%';
DELETE FROM public.place_images      WHERE "id"     LIKE 'dddd0000-%';
DELETE FROM public.places            WHERE "id"     LIKE 'cccc0000-%';

DELETE FROM auth.identities
WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

DELETE FROM auth.users
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

*/
