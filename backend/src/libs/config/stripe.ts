import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Configuration constants
export const STRIPE_CONFIG = {
  // Authorization hold expires after 7 days by default
  // We'll set it to 6 days to be safe
  AUTH_EXPIRY_DAYS: 6,

  // Currency
  CURRENCY: "usd" as const,

  // Platform commission rate (6.66%)
  PLATFORM_COMMISSION_RATE: 0.0666,

  // Metadata keys
  METADATA_KEYS: {
    BID_ID: "bid_id",
    STUDENT_ID: "student_id",
    PLACE_ID: "place_id",
    CHECK_IN_DATE: "check_in_date",
    CHECK_OUT_DATE: "check_out_date",
  },
} as const;
