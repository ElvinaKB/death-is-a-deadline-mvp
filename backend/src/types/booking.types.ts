import { bid_status, payment_status } from "@prisma/client";

export enum BookingStatus {
  BID_PENDING = "BID_PENDING",
  BID_REJECTED = "BID_REJECTED",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAYMENT_ACTION_REQUIRED = "PAYMENT_ACTION_REQUIRED",
  CONFIRMED = "CONFIRMED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_CANCELLED = "PAYMENT_CANCELLED",
  EXPIRED = "EXPIRED",
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.BID_PENDING]: "Legacy bid — contact support",
  [BookingStatus.BID_REJECTED]: "Bid rejected",
  [BookingStatus.PAYMENT_REQUIRED]: "Payment required",
  [BookingStatus.PAYMENT_PENDING]: "Payment processing",
  [BookingStatus.PAYMENT_ACTION_REQUIRED]: "Payment authentication required",
  [BookingStatus.CONFIRMED]: "Booking confirmed",
  [BookingStatus.PAYMENT_FAILED]: "Payment failed",
  [BookingStatus.PAYMENT_CANCELLED]: "Payment cancelled",
  [BookingStatus.EXPIRED]: "Payment expired",
};

export function deriveBookingStatus(
  bidStatus: bid_status,
  paymentStatus?: payment_status | null,
): BookingStatus {
  if (bidStatus === bid_status.REJECTED) {
    return BookingStatus.BID_REJECTED;
  }

  if (bidStatus === bid_status.PENDING) {
    return BookingStatus.BID_PENDING;
  }

  // ACCEPTED — payment state determines booking UX
  if (!paymentStatus) {
    return BookingStatus.PAYMENT_REQUIRED;
  }

  switch (paymentStatus) {
    case payment_status.PENDING:
      return BookingStatus.PAYMENT_PENDING;
    case payment_status.REQUIRES_ACTION:
      return BookingStatus.PAYMENT_ACTION_REQUIRED;
    case payment_status.CAPTURED:
      return BookingStatus.CONFIRMED;
    case payment_status.FAILED:
      return BookingStatus.PAYMENT_FAILED;
    case payment_status.CANCELLED:
      return BookingStatus.PAYMENT_CANCELLED;
    case payment_status.EXPIRED:
      return BookingStatus.EXPIRED;
    case payment_status.AUTHORIZED:
      return BookingStatus.PAYMENT_PENDING;
    default:
      return BookingStatus.PAYMENT_REQUIRED;
  }
}
