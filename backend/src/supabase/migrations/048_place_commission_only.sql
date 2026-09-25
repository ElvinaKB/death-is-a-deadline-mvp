-- Per-listing payment model.
--   true  (default) = Model B / commission-only: the guest is charged only the
--     7% booking fee now and the hotel collects the room balance + taxes at the
--     front desk. This is the default for every new / third-party hotel.
--   false = Model A / full-collection (Merchant of Record): Deadline charges the
--     full room total now. Used for our own PodShare properties.
--
-- The column defaults to true so any hotel that joins later is commission-only
-- automatically. We then flip every EXISTING listing (all currently ours) to
-- full-collection, so our own testing charges the full amount on Deadline.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS commission_only boolean NOT NULL DEFAULT true;

UPDATE places SET commission_only = false;
