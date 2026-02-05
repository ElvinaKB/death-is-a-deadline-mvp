-- Migration: Add allowed_days_of_week column to places table

-- Add allowed_days_of_week column (array of integers 0-6, where 0=Sunday, 1=Monday, etc.)
-- Default to all days allowed [0,1,2,3,4,5,6]
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS allowed_days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_places_allowed_days ON public.places USING GIN (allowed_days_of_week);
