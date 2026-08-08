-- Migration: mandatory-fee disclosure fields, for FTC Junk Fees Rule
-- (effective 2025-05-12) and California SB 478 / AB 537 all-in-pricing
-- compliance. A hotel's mandatory resort/parking fee must be folded into
-- the total price shown before checkout, not collected separately at
-- check-in — unlike government taxes and genuinely optional charges.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS mandatory_resort_fee_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mandatory_parking_fee_amount DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Snapshot of the mandatory fee at booking time, so a hotel's later fee
-- changes never alter what an existing bid was booked and charged at.
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS mandatory_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
