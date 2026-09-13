// Builds a "Add to Google Calendar" link for a booking. All-day event; Google
// treats the end date as exclusive, so checkout + 1 covers the final night.
export interface CalendarBooking {
  hotelName: string;
  guestName: string;
  bookingId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestCount: number;
  roomType: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  balanceLine?: string; // e.g. "Balance due: $46.50 + tax" (Model B) — optional
}

function toCalendarDate(dateOnly: string): string {
  // dateOnly is YYYY-MM-DD; noon UTC avoids any TZ date-rollover.
  return new Date(`${dateOnly}T12:00:00Z`)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}

function addDaysDateOnly(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildGoogleCalendarUrl(booking: CalendarBooking): string {
  const start = toCalendarDate(booking.checkIn);
  const end = toCalendarDate(addDaysDateOnly(booking.checkOut, 1)); // end exclusive

  const title = `${booking.hotelName} — Deadline Booking — ${booking.guestName}`;
  const details = [
    `Booking #${booking.bookingId}`,
    `${booking.guestCount} ${booking.guestCount === 1 ? "guest" : "guests"} · ${booking.roomType}`,
    ...(booking.balanceLine ? [booking.balanceLine] : []),
    "",
    ...(booking.guestPhone ? [`Guest phone: ${booking.guestPhone}`] : []),
    ...(booking.guestEmail ? [`Guest email: ${booking.guestEmail}`] : []),
    "",
    "Booked through Deadline",
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
