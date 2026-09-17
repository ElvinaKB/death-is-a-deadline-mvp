// Model B (commission-only): the guest is charged ONLY the booking fee (7% of
// the room total) at bid time; the hotel collects the room balance + taxes at
// the front desk. Keep this in sync with backend STRIPE_CONFIG.COMMISSION_ONLY_MODE.
export const COMMISSION_ONLY = true;
export const COMMISSION_RATE = 0.07;

/** The booking fee charged to the guest now (7% of the room total). */
export function commissionOf(roomTotal: number): number {
  return Math.round(roomTotal * COMMISSION_RATE * 100) / 100;
}

/** The balance the hotel collects at check-in (room total − booking fee). */
export function dueAtHotel(roomTotal: number): number {
  return Math.round((roomTotal - commissionOf(roomTotal)) * 100) / 100;
}
