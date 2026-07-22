import { bid_status } from "@prisma/client";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { prisma } from "../libs/config/prisma";
import {
  parseBookingDateOnly,
  toCalendarDateKey,
} from "../libs/utils/hotelDates";

/**
 * Per-date effective inventory cap = min(maxInventory, Cloudbeds `units`),
 * keyed yyyy-MM-dd for [fromDate, toDate] inclusive. Dates with no channel
 * availability row default to `maxInventory` — i.e. a hotel not connected to a
 * channel manager, or a date Cloudbeds hasn't pushed, behaves exactly as before
 * this ledger existed. Cloudbeds availability can only ever *lower* the cap.
 */
export async function getEffectiveCapByDate(
  placeId: string,
  maxInventory: number,
  fromDate: string,
  toDate: string,
): Promise<Map<string, number>> {
  const from = parseBookingDateOnly(fromDate);
  const to = parseBookingDateOnly(toDate);
  const caps = new Map<string, number>();
  if (from > to) return caps;

  try {
    const rows = await prisma.placeChannelAvailability.findMany({
      where: { placeId, date: { gte: from, lte: to } },
      select: { date: true, units: true },
    });
    for (const r of rows) {
      caps.set(toCalendarDateKey(r.date), Math.min(maxInventory, r.units));
    }
  } catch (err) {
    // If the table doesn't exist yet (migration 036 not run) or the query
    // fails, fall back to maxInventory-only behaviour rather than breaking
    // availability checks. Deploy-order-safe: code can ship before migration.
    console.warn(
      "[inventory] channel availability lookup failed; falling back to maxInventory",
      err,
    );
    return new Map();
  }
  return caps;
}

/** Night is occupied when date falls in [checkIn, checkOut). */
export function bidOccupiesNight(
  checkInDate: Date,
  checkOutDate: Date,
  nightDateOnly: string,
): boolean {
  const checkIn = toCalendarDateKey(checkInDate);
  const checkOut = toCalendarDateKey(checkOutDate);
  return checkIn <= nightDateOnly && checkOut > nightDateOnly;
}

/** yyyy-MM-dd nights with no remaining inventory in [from, to] inclusive. */
export async function getSoldOutNightsInRange(
  placeId: string,
  maxInventory: number,
  fromDate: string,
  toDate: string,
): Promise<string[]> {
  const from = parseBookingDateOnly(fromDate);
  const to = parseBookingDateOnly(toDate);
  if (from > to) return [];

  const rangeEnd = addDays(to, 1);
  const [acceptedBids, effectiveCaps] = await Promise.all([
    prisma.bid.findMany({
      where: {
        placeId,
        status: bid_status.ACCEPTED,
        checkInDate: { lt: rangeEnd },
        checkOutDate: { gt: from },
      },
      select: { checkInDate: true, checkOutDate: true },
    }),
    getEffectiveCapByDate(placeId, maxInventory, fromDate, toDate),
  ]);

  const soldOut: string[] = [];
  for (const night of eachDayOfInterval({ start: from, end: to })) {
    const nightKey = format(night, "yyyy-MM-dd");
    const count = acceptedBids.filter((b) =>
      bidOccupiesNight(b.checkInDate, b.checkOutDate, nightKey),
    ).length;
    const cap = effectiveCaps.get(nightKey) ?? maxInventory;
    if (count >= cap) {
      soldOut.push(nightKey);
    }
  }

  return soldOut;
}
