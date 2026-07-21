-- Add CANCELLED to bid_status and REFUNDED to payment_status so an accepted,
-- charged bid can be cancelled with a full refund.
ALTER TYPE "public"."bid_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- Track the refund itself on the payment row.
ALTER TABLE "public"."payments"
  ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "stripe_refund_id" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_stripe_refund_id_key"
  ON "public"."payments" ("stripe_refund_id");
