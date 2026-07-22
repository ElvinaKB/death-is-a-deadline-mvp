import axios from "axios";

// Outbound calls Deadline makes *to* Cloudbeds/myallocator (the reverse
// direction of backend/src/routers/myallocator.router.ts, which handles
// calls myallocator makes *to* Deadline).
// Spec: https://developers.cloudbeds.com/reference/notify_booking

function getMyallocatorCallbackBase(): string | null {
  const sharedSecret = process.env.MYALLOCATOR_SHARED_SECRET;
  const otaCid = process.env.MYALLOCATOR_OTA_CID;
  if (!sharedSecret || !otaCid) {
    console.warn(
      "[myallocator] MYALLOCATOR_SHARED_SECRET/MYALLOCATOR_OTA_CID not set — skipping outbound notify (not credentialed yet)",
    );
    return null;
  }
  return `https://api.myallocator.com/callback/ota/${otaCid}/v202203`;
}

// Tells Cloudbeds to re-poll GetBookingList immediately for this booking,
// instead of waiting for its normal 5-30 minute cycle. Used in both
// directions: when Deadline confirms a booking (so Cloudbeds imports it and
// drops the room's availability everywhere) and when one is cancelled (so the
// room reopens) — as close to instantly as the API allows.
async function notifyBooking(
  bookingId: string,
  otaPropertyId: string,
): Promise<void> {
  const base = getMyallocatorCallbackBase();
  if (!base) return;

  await axios.post(
    `${base}/NotifyBooking`,
    {
      ota_property_id: otaPropertyId,
      booking_id: bookingId,
      shared_secret: process.env.MYALLOCATOR_SHARED_SECRET,
    },
    { timeout: 10_000 },
  );
}

/** Deadline just confirmed a booking — prompt Cloudbeds to import it now. */
export async function notifyBookingConfirmed(
  bookingId: string,
  otaPropertyId: string,
): Promise<void> {
  return notifyBooking(bookingId, otaPropertyId);
}

/** Deadline cancelled a booking — prompt Cloudbeds to reopen the room now. */
export async function notifyBookingCancelled(
  bookingId: string,
  otaPropertyId: string,
): Promise<void> {
  return notifyBooking(bookingId, otaPropertyId);
}
