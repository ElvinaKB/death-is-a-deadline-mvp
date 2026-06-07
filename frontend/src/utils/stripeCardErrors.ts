import type { StripeError } from "@stripe/stripe-js";
import { getPublishableStripeMode } from "../lib/stripe";

export const LIVE_MODE_TEST_CARD_MESSAGE =
  "Test cards cannot be used with live payments. Please use a real debit or credit card.";

export const STRIPE_KEY_MISMATCH_MESSAGE =
  "Payment configuration error: your card cannot be verified. Test and live Stripe keys may be mixed — contact support.";

export function formatStripeCardError(error: StripeError): string {
  if (isLikelyTestCardRejection(error)) {
    return LIVE_MODE_TEST_CARD_MESSAGE;
  }
  if (error.type === "card_error" || error.type === "validation_error") {
    return error.message || "Your card was declined.";
  }
  return error.message || "Payment failed. Please try again.";
}

export function isLikelyTestCardRejection(error: StripeError): boolean {
  if (getPublishableStripeMode() !== "live") return false;

  const msg = (error.message || "").toLowerCase();
  return (
    error.decline_code === "live_mode_test_card" ||
    error.code === "live_mode_test_card" ||
    msg.includes("test mode") ||
    msg.includes("test card") ||
    msg.includes("live mode")
  );
}

export function stripeModesMismatch(
  frontendMode: ReturnType<typeof getPublishableStripeMode>,
  backendMode: "test" | "live" | undefined,
): boolean {
  return !!frontendMode && !!backendMode && frontendMode !== backendMode;
}
