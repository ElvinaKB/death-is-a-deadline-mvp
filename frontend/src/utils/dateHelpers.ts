import {
  addDays,
  eachDayOfInterval,
  format,
  isBefore,
  parseISO,
  isValid,
} from "date-fns";

/** Normalize any stored/API date to yyyy-MM-dd (backend inventory & blackout format). */
export function toApiDateOnly(
  value: string | Date | null | undefined,
): string | undefined {
  if (value == null || value === "") return undefined;

  if (value instanceof Date) {
    if (!isValid(value)) return undefined;
    return format(value, "yyyy-MM-dd");
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // API @db.Date values arrive as UTC midnight ISO — use calendar date, not local TZ
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return undefined;
  return format(parsed, "yyyy-MM-dd");
}

/** Parse yyyy-MM-dd or ISO string to local Date for calendars. */
export function parseApiDate(value: string | null | undefined): Date | undefined {
  const dateOnly = toApiDateOnly(value);
  if (!dateOnly) return undefined;
  const [y, m, d] = dateOnly.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return isValid(local) ? local : undefined;
}

/**
 * Format a booking calendar date for display (hotel night, not a timestamp).
 * Safe for yyyy-MM-dd strings and UTC-midnight ISO from the API.
 */
export function formatBookingDate(
  value: string | Date | null | undefined,
  pattern = "MMM d, yyyy",
): string {
  const dateOnly = toApiDateOnly(value);
  if (!dateOnly) return "";
  const [y, m, d] = dateOnly.split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern);
}

/**
 * Occupied nights for a stay: [check-in, check-out) — checkout day excluded.
 * Matches backend: blackout >= checkIn && blackout < checkOut.
 */
export function getOccupiedNightDates(
  checkIn: Date,
  checkOut: Date,
): Date[] {
  if (!isBefore(checkIn, checkOut)) return [];
  const lastOccupiedNight = addDays(checkOut, -1);
  return eachDayOfInterval({ start: checkIn, end: lastOccupiedNight });
}

export function isDateInBlackout(
  date: Date,
  blackoutDates: string[] | undefined,
): boolean {
  if (!blackoutDates?.length) return false;
  const dateStr = toApiDateOnly(date);
  return dateStr ? blackoutDates.includes(dateStr) : false;
}

/** Calendar-night overlap: [checkIn, checkOut) intervals share a night. */
export function bookingDatesOverlap(
  aCheckIn: Date,
  aCheckOut: Date,
  bCheckIn: Date | string,
  bCheckOut: Date | string,
): boolean {
  const aIn = toApiDateOnly(aCheckIn);
  const aOut = toApiDateOnly(aCheckOut);
  const bIn = toApiDateOnly(bCheckIn);
  const bOut = toApiDateOnly(bCheckOut);
  if (!aIn || !aOut || !bIn || !bOut) return false;
  return aIn < bOut && aOut > bIn;
}

export function isDayOfWeekAllowed(
  date: Date,
  allowedDaysOfWeek: number[] | undefined,
): boolean {
  if (!allowedDaysOfWeek?.length) return true;
  return allowedDaysOfWeek.includes(date.getDay());
}

/** True when any occupied night in [checkIn, checkOut) is sold out. */
export function stayIncludesSoldOutNight(
  checkIn: Date,
  checkOut: Date,
  soldOutNights: Set<string>,
): boolean {
  if (!soldOutNights.size) return false;
  return getOccupiedNightDates(checkIn, checkOut).some((night) => {
    const key = toApiDateOnly(night);
    return key ? soldOutNights.has(key) : false;
  });
}
