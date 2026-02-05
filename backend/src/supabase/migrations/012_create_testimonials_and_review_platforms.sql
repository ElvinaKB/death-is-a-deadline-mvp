-- Migration: Create testimonial and review_platform tables for places

-- 1. Create testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);

-- 2. Create review_platform table
CREATE TABLE IF NOT EXISTS public.review_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rating DECIMAL(3,2) NOT NULL,
  review_count INTEGER NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('google', 'yelp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_platforms_unique_place_source UNIQUE (place_id, source)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_testimonials_place_id ON public.testimonials(place_id);
CREATE INDEX IF NOT EXISTS idx_review_platforms_place_id ON public.review_platforms(place_id);
CREATE INDEX IF NOT EXISTS idx_review_platforms_source ON public.review_platforms(source);

-- 4. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER trigger_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

CREATE OR REPLACE FUNCTION update_review_platforms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_platforms_updated_at ON public.review_platforms;
CREATE TRIGGER trigger_review_platforms_updated_at
  BEFORE UPDATE ON public.review_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_review_platforms_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_platforms ENABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
GRANT ALL ON public.review_platforms TO authenticated;
GRANT ALL ON public.review_platforms TO service_role;
