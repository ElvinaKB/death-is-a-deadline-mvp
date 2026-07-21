-- Migration: Remove the anon INSERT policy on student-id-cards
--
-- The anon INSERT policy allowed anyone on the internet to upload directly
-- to this bucket with no auth and no rate limit. Uploads now go through
-- backend-minted signed upload URLs (POST /api/auth/upload-url, rate
-- limited), which authorize the upload at mint time independent of this
-- policy — so the blanket anon grant is no longer needed.
DROP POLICY IF EXISTS "Anon upload for student-id-cards" ON storage.objects;
