-- Migration: Create bids table with foreign key to auth.users

-- 1. Create bid status enum
DO $$ BEGIN
  CREATE TYPE bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  bid_per_night DECIMAL(10, 2) NOT NULL,
  total_nights INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status bid_status NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT check_bid_positive CHECK (bid_per_night > 0),
  CONSTRAINT check_nights_positive CHECK (total_nights > 0),
  CONSTRAINT check_amount_positive CHECK (total_amount > 0)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bids_place_id ON public.bids(place_id);
CREATE INDEX IF NOT EXISTS idx_bids_student_id ON public.bids(student_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);

-- 4. Create unique constraint to prevent duplicate active bids for same place/student/dates
-- (A student can't have multiple pending bids for overlapping dates on the same place)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_unique_pending 
ON public.bids(place_id, student_id, check_in_date, check_out_date) 
WHERE status = 'PENDING';

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bids_updated_at ON public.bids;
CREATE TRIGGER trigger_bids_updated_at
  BEFORE UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION update_bids_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Students can view their own bids
CREATE POLICY "Students can view own bids"
  ON public.bids
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can create bids (only for themselves)
CREATE POLICY "Students can create own bids"
  ON public.bids
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Admins can view all bids
CREATE POLICY "Admins can view all bids"
  ON public.bids
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

-- Admins can update bid status
CREATE POLICY "Admins can update bids"
  ON public.bids
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

-- Grant permissions
GRANT ALL ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
