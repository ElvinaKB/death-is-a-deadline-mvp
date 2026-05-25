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

/** Second-step payment UI — Stripe/bank hold only, never DB PENDING after create-intent. */
export function shouldShowStripeCompletionUI(
  paymentStatus?: PaymentStatus | string | null,
): boolean {
  return paymentStatus === PaymentStatus.REQUIRES_ACTION;
}

export function isDbPaymentAwaitingCapture(
  paymentStatus?: PaymentStatus | string | null,
): boolean {
  return paymentStatus === PaymentStatus.PENDING;
}

export type BidLockInPreviewKind =
  | "below_minimum"
  | "instant_accept"
  | "hotel_review";

/** Client-side preview while lock-in timer runs (matches production bid rules). */
export function getBidLockInPreview(
  place: { minimumBid: number; autoAcceptAboveMinimum: boolean },
  bidPerNight: number,
): { kind: BidLockInPreviewKind; title: string; detail: string } {
  if (!Number.isFinite(bidPerNight) || bidPerNight <= 0) {
    return {
      kind: "hotel_review",
      title: "Review your bid",
      detail: "Enter a valid bid amount to see if it qualifies.",
    };
  }
  if (bidPerNight < place.minimumBid) {
    return {
      kind: "below_minimum",
      title: "Bid below minimum",
      detail: `This listing requires at least $${place.minimumBid}/night. If you confirm, the bid will not be accepted and your card will not be charged.`,
    };
  }
  if (place.autoAcceptAboveMinimum) {
    return {
      kind: "instant_accept",
      title: "Instant accept expected",
      detail:
        "At this amount your bid should be accepted when you confirm. Your card on file will be charged immediately.",
    };
  }
  return {
    kind: "hotel_review",
    title: "Awaiting hotel review",
    detail:
      "Your bid meets the minimum but needs hotel approval. You will not be charged until it is accepted.",
  };
}
