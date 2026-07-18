ALTER TABLE "public"."waitlist_signups"
  ADD COLUMN IF NOT EXISTS "marketing_consent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" TIMESTAMP(3);
