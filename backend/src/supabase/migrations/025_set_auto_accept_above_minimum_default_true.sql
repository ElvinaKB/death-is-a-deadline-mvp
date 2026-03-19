-- Migration: Set auto_accept_above_minimum default to true
ALTER TABLE public.places
ALTER COLUMN "autoAcceptAboveMinimum" SET DEFAULT true;
