-- Hotel-local "today" for stay status, rebooking, and overlap (IANA timezone)
ALTER TABLE "public"."places"
ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64);

UPDATE "public"."places"
SET "timezone" = 'America/Los_Angeles'
WHERE "timezone" IS NULL OR TRIM("timezone") = '';
