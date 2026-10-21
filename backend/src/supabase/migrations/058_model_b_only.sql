-- Model B is now the only model. We've retired Model A (merchant-of-record /
-- full-charge) entirely: every listing — including our own PodShare / Social
-- Stays properties — is commission-only (we charge the guest our 7% booking
-- fee; the hotel collects the room balance + taxes at the desk).
--
-- Migration 048 had set existing listings to Model A for the internal test.
-- Flip them all to Model B. New listings already default to true, and the admin
-- toggle that could set this false has been removed, so this is a one-way move.
UPDATE public.places
SET commission_only = true
WHERE commission_only = false;

-- Belt-and-suspenders: make the column default match reality so nothing can be
-- created as Model A even if a future caller omits the field.
ALTER TABLE public.places ALTER COLUMN commission_only SET DEFAULT true;
