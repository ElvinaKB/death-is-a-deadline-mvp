-- The public hotel signup form no longer asks for the secret price
-- up front (it's discussed directly with the hotel instead), so the
-- column can no longer be required at submission time.
ALTER TABLE hotel_applications
  ALTER COLUMN secret_price DROP NOT NULL;
