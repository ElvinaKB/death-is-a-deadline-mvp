/**
 * Hotel calendar dates — bookings are yyyy-MM-dd nights; "today" uses the property IANA timezone.
 */

export const DEFAULT_HOTEL_TIMEZONE = "America/Los_Angeles";

export type PlaceTimezoneSource = {
  timezone?: string | null;
  city?: string;
  country?: string;
};

/** Known US cities for MVP listings (extend as hotels are added). */
const CITY_TIMEZONE: Record<string, string> = {
  "los angeles": "America/Los_Angeles",
  "la": "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "new york": "America/New_York",
  "nyc": "America/New_York",
  "chicago": "America/Chicago",
  "houston": "America/Chicago",
  "phoenix": "America/Phoenix",
  "miami": "America/New_York",
  "seattle": "America/Los_Angeles",
  "boston": "America/New_York",
  "las vegas": "America/Los_Angeles",
};

export function isValidIanaTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function inferTimezoneFromLocation(
  city?: string,
  country?: string,
): string {
  const cityKey = city?.trim().toLowerCase() ?? "";
  if (cityKey && CITY_TIMEZONE[cityKey]) {
    return CITY_TIMEZONE[cityKey];
  }

  const countryKey = country?.trim().toLowerCase() ?? "";
  if (
    countryKey === "united states" ||
    countryKey === "usa" ||
    countryKey === "us"
  ) {
    return DEFAULT_HOTEL_TIMEZONE;
  }

  return DEFAULT_HOTEL_TIMEZONE;
}

export function resolvePlaceTimezone(place: PlaceTimezoneSource): string {
  const stored = place.timezone?.trim();
  if (stored && isValidIanaTimezone(stored)) {
    return stored;
  }
  return inferTimezoneFromLocation(place.city, place.country);
}

/** Today's calendar date at the hotel (yyyy-MM-dd). */
export function getHotelToday(
  place: PlaceTimezoneSource,
  at: Date = new Date(),
): string {
  return getCalendarDateInTimezone(resolvePlaceTimezone(place), at);
}

export function getCalendarDateInTimezone(
  timeZone: string,
  at: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Normalize @db.Date / API value to yyyy-MM-dd for comparisons. */
export function toCalendarDateKey(value: Date | string): string {
  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0]! : value.slice(0, 10);
  }
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse API date (yyyy-MM-dd or ISO) to UTC midnight for Prisma @db.Date. */
export function parseBookingDateOnly(input: string): Date {
  const dateOnly = input.includes("T") ? input.split("T")[0]! : input.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error(`Invalid booking date: ${input}`);
  }
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

export function hotelTodayAsDate(place: PlaceTimezoneSource): Date {
  return parseBookingDateOnly(getHotelToday(place));
}

/** Checkout on or before hotel today → stay is done; student may rebook. */
export function isStayCompletedAtHotel(
  checkOutDate: Date,
  hotelToday: string,
): boolean {
  return toCalendarDateKey(checkOutDate) <= hotelToday;
}

/** Checkout after hotel today → still an active/upcoming stay. */
export function isStayActiveAtHotel(
  checkOutDate: Date,
  hotelToday: string,
): boolean {
  return toCalendarDateKey(checkOutDate) > hotelToday;
}

/** Calendar-night overlap: [checkIn, checkOut) intervals share a night. */
export function bookingDatesOverlap(
  aCheckIn: Date,
  aCheckOut: Date,
  bCheckIn: Date,
  bCheckOut: Date,
): boolean {
  const aIn = toCalendarDateKey(aCheckIn);
  const aOut = toCalendarDateKey(aCheckOut);
  const bIn = toCalendarDateKey(bCheckIn);
  const bOut = toCalendarDateKey(bCheckOut);
  return aIn < bOut && aOut > bIn;
}
