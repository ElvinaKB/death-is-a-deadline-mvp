import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not defined");
}

export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
