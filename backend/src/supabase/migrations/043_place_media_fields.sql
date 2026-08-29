-- Migration: optional listing-page media fields, admin/hotel-owner editable
-- from the Places dashboard (no code changes needed to swap them out later).
--   vertical_video_url          - direct link to an MP4/WebM video file,
--                                 rendered on the listing detail page next
--                                 to the FAQ when present.
--   neighborhood_guide_text     - free text describing what's nearby, shown
--                                 next to the location map when present.
--   neighborhood_guide_image_url - optional photo alongside that text.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS vertical_video_url TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood_guide_text TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood_guide_image_url TEXT;
