BEGIN;

ALTER TYPE "public"."AccommodationType" RENAME TO "AccommodationType_old";

CREATE TYPE "public"."AccommodationType" AS ENUM ('MOTEL', 'HOTEL', 'HOSTEL');

ALTER TABLE "public"."places"
ALTER COLUMN "accommodationType" TYPE "public"."AccommodationType"
USING (
  CASE "accommodationType"::text
    WHEN 'HOSTEL' THEN 'HOSTEL'
    ELSE 'HOTEL'
  END
)::"public"."AccommodationType";

DROP TYPE "public"."AccommodationType_old";

COMMIT;
