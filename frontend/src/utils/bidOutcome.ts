import { BidStatus } from "../types/bid.types";
import { PaymentStatus } from "../types/payment.types";

const LOW_BID_PHRASE = "very low";

/** Production: POST /api/bids returns 400 when bidPerNight < place.minimumBid */
export function isLowBidRejection(error: {
  statusCode?: number;
  message?: string;
}): boolean {
  if (error.statusCode !== 400) return false;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes(LOW_BID_PHRASE);
}

/** Reservation Confirmed panel — bid ACCEPTED and payment captured (or just succeeded in-session). */
export function shouldShowConfirmedOutcome(
  bidStatus: BidStatus,
  paymentStatus?: PaymentStatus | string | null,
  paymentComplete?: boolean,
): boolean {
  if (bidStatus !== BidStatus.ACCEPTED) return false;
  if (paymentComplete) return true;
  return paymentStatus === PaymentStatus.CAPTURED;
}

/** Not Accepted panel — explicit REJECTED bid (preview mock only; prod uses 400 for low bids). */
export function shouldShowRejectedOutcome(bidStatus: BidStatus): boolean {
  return bidStatus === BidStatus.REJECTED;
}

/** Only when Stripe needs an extra step (3DS), not when payment row is merely PENDING. */
export function isStripeActionRequired(
  confirmResult?: { requiresAction?: boolean },
  paymentStatus?: PaymentStatus | string | null,
): boolean {
  return (
    !!confirmResult?.requiresAction ||
    paymentStatus === PaymentStatus.REQUIRES_ACTION
  );
}
