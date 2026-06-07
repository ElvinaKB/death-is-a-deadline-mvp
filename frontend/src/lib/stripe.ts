import { loadStripe } from "@stripe/stripe-js";

export type StripeMode = "test" | "live";

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not defined");
}

export function getPublishableStripeMode(): StripeMode | null {
  if (!stripePublishableKey) return null;
  if (stripePublishableKey.startsWith("pk_live_")) return "live";
  if (stripePublishableKey.startsWith("pk_test_")) return "test";
  return null;
}

export function isStripeLiveMode(): boolean {
  return getPublishableStripeMode() === "live";
}

export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
