-- Add commission and payable amount fields to bids table
-- Commission is the platform fee (6.66% of total amount)
-- Payable to hotel is the remaining amount after commission

ALTER TABLE public.bids
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payable_to_hotel DECIMAL(10, 2) DEFAULT NULL;

-- Add index for reporting queries
CREATE INDEX IF NOT EXISTS idx_bids_platform_commission ON public.bids(platform_commission) WHERE platform_commission IS NOT NULL;

COMMENT ON COLUMN public.bids.platform_commission IS 'Platform commission amount (6.66% of total_amount)';
COMMENT ON COLUMN public.bids.payable_to_hotel IS 'Amount payable to hotel after commission deduction';
