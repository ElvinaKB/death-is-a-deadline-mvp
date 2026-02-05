-- Add max inventory (rooms/beds cap) to places table
-- This prevents overselling and allows limited inventory offers

ALTER TABLE "public"."places"
ADD COLUMN "max_inventory" INTEGER NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN "public"."places"."max_inventory" IS 'Maximum number of rooms/beds available per date. Prevents overselling.';
