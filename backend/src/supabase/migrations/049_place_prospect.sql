-- Cold-outreach prospect flag. A prospect is a listing we built to pitch a hotel
-- (private preview link) that hasn't engaged yet. It's shown in a separate
-- "Prospects" tab so the main Listings view isn't flooded with cold-email
-- listings that may never activate. Cleared (promoted to Listings) when the
-- hotel engages: submits the preview contact form, or the listing goes LIVE.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS prospect boolean NOT NULL DEFAULT false;

-- The Hotel Indigo listing we built for cold outreach starts as a prospect.
UPDATE places SET prospect = true
WHERE slug = 'hotel-indigo-los-angeles-downtown';
