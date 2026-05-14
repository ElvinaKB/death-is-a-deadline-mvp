-- Migration: Create student-id-cards bucket and full storage policies

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-id-cards',
  'student-id-cards',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT: anon can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public read for student-id-cards'
  ) THEN
    CREATE POLICY "Public read for student-id-cards"
      ON storage.objects
      FOR SELECT
      TO anon
      USING (bucket_id = 'student-id-cards');
  END IF;
END $$;

-- INSERT: authenticated users can upload
CREATE POLICY "Authenticated upload for student-id-cards"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-id-cards');

-- INSERT: anon users can upload
CREATE POLICY "Anon upload for student-id-cards"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'student-id-cards');

-- UPDATE: authenticated users can replace
CREATE POLICY "Authenticated update for student-id-cards"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-id-cards');

-- DELETE: authenticated users can delete
CREATE POLICY "Authenticated delete for student-id-cards"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-id-cards');

  UPDATE storage.buckets
  SET public = true
  WHERE name = 'student-id-cards';