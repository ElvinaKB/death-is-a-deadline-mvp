/**
 * Chargeback-safe payout gating (client-side mirror of the backend rule).
 *
 * A hotel payout is only "due" once the guest has actually stayed: we hold
 * until checkout + PAYOUT_HOLD_HOURS so no-shows/cancellations clear before
 * money leaves. This does NOT remove card-chargeback liability — only card
 * pass-through does that — it de-risks the operational (no-show) case.
 */
export const PAYOUT_HOLD_HOURS = 48;

export type PayoutState = "paid" | "due" | "held" | "na";

export interface PayoutRowInput {
  status: string;
  isPaidToHotel: boolean;
  checkOutDate: string;
  paidToHotelAt?: string | null;
}

/** When it becomes safe to pay: checkout + 48h. */
export function payoutEligibleAt(checkOutDate: string): Date {
  return new Date(
    new Date(checkOutDate).getTime() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000,
  );
}

export function getPayoutState(row: PayoutRowInput): PayoutState {
  if (row.isPaidToHotel) return "paid";
  if (row.status !== "ACCEPTED") return "na";
  return Date.now() >= payoutEligibleAt(row.checkOutDate).getTime()
    ? "due"
    : "held";
}
