// The payment model is now PER-LISTING: read `place.commissionOnly` on each
// Place instead of a global flag. true = Model B (commission-only: the guest is
// charged ONLY the 7% booking fee now; the hotel collects the balance + taxes at
// the desk). false = Model A (the full room total is charged now). New/third-party
// listings default to Model B; our own PodShare properties are Model A.
//
// This constant is only the fallback default when a place's value is missing.
// Keep it in sync with backend STRIPE_CONFIG.COMMISSION_ONLY_MODE.
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
