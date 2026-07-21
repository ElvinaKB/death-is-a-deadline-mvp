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
// instead of waiting for its normal 5-30 minute cycle — used so a cancelled
// room reopens on Cloudbeds (and everywhere else its channel manager
// distributes availability) as close to instantly as the API allows.
export async function notifyBookingCancelled(
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
