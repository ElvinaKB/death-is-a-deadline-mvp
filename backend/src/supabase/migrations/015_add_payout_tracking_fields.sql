-- Add payout tracking fields to bids table
-- These track whether the hotel has been paid and by what method

ALTER TABLE public.bids
ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_paid_to_hotel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_to_hotel_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_notes TEXT DEFAULT NULL;

-- Add index for unpaid bids that need attention
CREATE INDEX IF NOT EXISTS idx_bids_unpaid_hotels ON public.bids(is_paid_to_hotel, status) 
WHERE is_paid_to_hotel = FALSE AND status = 'ACCEPTED';

COMMENT ON COLUMN public.bids.payout_method IS 'Payment method used to pay the hotel (ACH, Wire, Zelle, Wise, etc.)';
COMMENT ON COLUMN public.bids.is_paid_to_hotel IS 'Whether the hotel has been paid their share';
COMMENT ON COLUMN public.bids.paid_to_hotel_at IS 'Timestamp when the hotel was paid';
COMMENT ON COLUMN public.bids.payout_notes IS 'Admin notes about the payout';
