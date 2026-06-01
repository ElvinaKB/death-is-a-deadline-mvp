-- Enforce instant auto-accept on all listings (no manual bid review mode)
UPDATE public.places
SET "autoAcceptAboveMinimum" = true
WHERE "autoAcceptAboveMinimum" = false;
