import { bid_status } from "@prisma/client";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { prisma } from "../libs/config/prisma";
import {
  parseBookingDateOnly,
  toCalendarDateKey,
} from "../libs/utils/hotelDates";

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
  const acceptedBids = await prisma.bid.findMany({
    where: {
      placeId,
      status: bid_status.ACCEPTED,
      checkInDate: { lt: rangeEnd },
      checkOutDate: { gt: from },
    },
    select: { checkInDate: true, checkOutDate: true },
  });

  const soldOut: string[] = [];
  for (const night of eachDayOfInterval({ start: from, end: to })) {
    const nightKey = format(night, "yyyy-MM-dd");
    const count = acceptedBids.filter((b) =>
      bidOccupiesNight(b.checkInDate, b.checkOutDate, nightKey),
    ).length;
    if (count >= maxInventory) {
      soldOut.push(nightKey);
    }
  }

  return soldOut;
}
