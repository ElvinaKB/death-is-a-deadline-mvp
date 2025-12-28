-- Migration: Make student-id-cards bucket public (allow anon select)

-- Policy: Allow anon users to select (read) objects from the student-id-cards bucket
create policy "Public read for student-id-cards"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'student-id-cards');
