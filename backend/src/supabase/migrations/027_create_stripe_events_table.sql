-- Idempotent Stripe webhook processing (PR 2)
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at
    ON public.stripe_events (created_at DESC);

COMMENT ON TABLE public.stripe_events IS 'Processed Stripe webhook event IDs for idempotency';
