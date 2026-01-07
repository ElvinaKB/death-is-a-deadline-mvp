-- Migration: Create payments table for Stripe pre-authorization flow

-- 1. Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',           -- PaymentIntent created, waiting for student to pay
    'REQUIRES_ACTION',   -- 3D Secure or additional auth needed
    'AUTHORIZED',        -- Card authorized, funds held (pre-auth success)
    'CAPTURED',          -- Funds captured by admin (money taken)
    'CANCELLED',         -- Hold released (admin rejected or cancelled)
    'FAILED',            -- Payment failed
    'EXPIRED'            -- Authorization expired (typically 7 days)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Amounts
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  
  -- Stripe References
  stripe_payment_intent_id VARCHAR(255) UNIQUE,  -- pi_xxxxx
  stripe_customer_id VARCHAR(255),                -- cus_xxxxx (for saved cards)
  stripe_payment_method_id VARCHAR(255),          -- pm_xxxxx (card used)
  stripe_client_secret VARCHAR(255),              -- For frontend confirmation
  
  -- Status Tracking
  status payment_status NOT NULL DEFAULT 'PENDING',
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                         -- When authorization expires
  
  -- Metadata
  failure_reason TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_amount_positive CHECK (amount > 0),
  CONSTRAINT check_currency_valid CHECK (currency IN ('usd', 'eur', 'gbp'))
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_bid_id ON public.payments(bid_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 4. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Students can view their own payments
CREATE POLICY "Students can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = student_id);

-- Admins can view all payments (check user role from metadata)
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        OR auth.users.role = 'ADMIN'
      )
    )
  );

-- Admins can update payments (for capture/cancel)
CREATE POLICY "Admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        OR auth.users.role = 'ADMIN'
      )
    )
  );

-- Service role can do everything (for backend API)
CREATE POLICY "Service role full access"
  ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- 7. Add comments for documentation
COMMENT ON TABLE public.payments IS 'Stores Stripe payment information for bids with pre-authorization flow';
COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (pi_xxxxx)';
COMMENT ON COLUMN public.payments.stripe_customer_id IS 'Stripe Customer ID for saved payment methods';
COMMENT ON COLUMN public.payments.stripe_client_secret IS 'Client secret for frontend payment confirmation';
COMMENT ON COLUMN public.payments.status IS 'Payment status: PENDING → AUTHORIZED → CAPTURED or CANCELLED';
COMMENT ON COLUMN public.payments.authorized_at IS 'Timestamp when funds were held on card';
COMMENT ON COLUMN public.payments.captured_at IS 'Timestamp when funds were actually charged';
COMMENT ON COLUMN public.payments.expires_at IS 'When the authorization hold expires (typically 7 days)';
