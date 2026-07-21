-- Migration: Remove the anon INSERT policy on student-id-cards (correct name)
--
-- Migration 033 dropped a policy named "Anon upload for student-id-cards",
-- matching the name used in migration 026's source. Live production, it
-- turns out, actually had a differently-named policy doing the same thing
-- ("Allow anon uploads" — same INSERT/anon/bucket_id='student-id-cards'
-- grant), which was never touched by 033 and left the original gap open.
-- Verified via a read-only query against pg_policies before writing this.
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
