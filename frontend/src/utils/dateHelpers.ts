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

  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return undefined;
  return format(parsed, "yyyy-MM-dd");
}

/** Parse yyyy-MM-dd or ISO string to local Date for calendars. */
export function parseApiDate(value: string | null | undefined): Date | undefined {
  const dateOnly = toApiDateOnly(value);
  if (!dateOnly) return undefined;
  const parsed = parseISO(dateOnly);
  return isValid(parsed) ? parsed : undefined;
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

export function isDayOfWeekAllowed(
  date: Date,
  allowedDaysOfWeek: number[] | undefined,
): boolean {
  if (!allowedDaysOfWeek?.length) return true;
  return allowedDaysOfWeek.includes(date.getDay());
}
