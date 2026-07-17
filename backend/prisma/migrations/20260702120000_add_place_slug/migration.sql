-- Human-readable URL slugs for marketplace listings
ALTER TABLE "public"."places" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100);

DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN
    SELECT id, name
    FROM places
    WHERE slug IS NULL OR TRIM(slug) = ''
    ORDER BY "createdAt"
  LOOP
    base_slug := lower(
      regexp_replace(
        regexp_replace(trim(r.name), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)',
        '',
        'g'
      )
    );

    IF base_slug = '' THEN
      base_slug := 'place';
    END IF;

    final_slug := left(base_slug, 80);
    counter := 2;

    WHILE EXISTS (
      SELECT 1 FROM places WHERE slug = final_slug AND id != r.id
    ) LOOP
      final_slug := left(base_slug, 76) || '-' || counter::text;
      counter := counter + 1;
    END LOOP;

    UPDATE places SET slug = final_slug WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "public"."places" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "places_slug_key" ON "public"."places"("slug");
