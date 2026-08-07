import { bid_status } from "@prisma/client";
import { addDays, differenceInDays } from "date-fns";
import { prisma } from "../libs/config/prisma";
import {
  hotelTodayAsDate,
  parseBookingDateOnly,
  PlaceTimezoneSource,
  toCalendarDateKey,
} from "../libs/utils/hotelDates";
import { bidOccupiesNight, getEffectiveCapByDate } from "./inventory.service";
import {
  getMinimumForNight,
  getOccupiedNights,
  ThresholdPricingPlace,
} from "./thresholdPricing.service";

/**
 * Dynamic ("flickering") bid threshold: the number a bid must clear is the
 * hidden floor (place.minimumBid / minimumBidByDayOfWeek) plus a premium
 * that drifts within a bounded random walk, biased by real signals
 * (inventory scarcity, lead time to check-in, recent bid activity). The
 * floor never moves and is never exposed to travelers — only accept/reject
 * outcomes are. Consecutive evaluations for the same place+night see a
 * correlated-but-shifting number rather than either a fixed value or pure
 * noise, so sharing "the number" with someone else is unreliable.
 *
 * All constants below are business levers — safe to retune without
 * touching the surrounding logic.
 */
const MIN_PREMIUM = 1; // effective threshold is always at least $1 above the floor
const MAX_PREMIUM = 20; // hard ceiling so scarcity+activity can't run away
const BASE_STARTING_PREMIUM = 3; // first-ever evaluation for a place+night starts here
const MAX_STEP = 4; // max +/- change per evaluation vs. the previous premium
const SCARCITY_MAX_BONUS = 12; // added as remaining inventory for that night approaches zero
const URGENCY_WINDOW_DAYS = 3; // inside this many days of check-in...
const URGENCY_MAX_DISCOUNT = 6; // ...pull the premium down by up to this much, to convert before the room expires unsold
const RECENT_REJECTION_LOOKBACK_HOURS = 24;
const RECENT_REJECTION_BONUS_PER = 1; // per recent rejected attempt on that night...
const RECENT_REJECTION_MAX_BONUS = 6; // ...capped here

export type DynamicPricingPlace = ThresholdPricingPlace &
  PlaceTimezoneSource & {
    id: string;
    maxInventory: number;
  };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Cent-safe rounding for sums/comparisons — distinct from the whole-dollar premium itself. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeNextPremium(params: {
  previousPremium: number | null;
  roomsRemaining: number;
  totalCapacity: number;
  daysUntilCheckIn: number;
  recentRejections: number;
}): number {
  const {
    previousPremium,
    roomsRemaining,
    totalCapacity,
    daysUntilCheckIn,
    recentRejections,
  } = params;

  const step = (Math.random() * 2 - 1) * MAX_STEP;

  const scarcityRatio =
    totalCapacity > 0 ? clamp(1 - roomsRemaining / totalCapacity, 0, 1) : 0;
  const scarcityBias = scarcityRatio * SCARCITY_MAX_BONUS;

  const urgencyDiscount =
    daysUntilCheckIn >= 0 && daysUntilCheckIn <= URGENCY_WINDOW_DAYS
      ? ((URGENCY_WINDOW_DAYS - daysUntilCheckIn) / URGENCY_WINDOW_DAYS) *
        URGENCY_MAX_DISCOUNT
      : 0;

  const activityBonus = Math.min(
    recentRejections * RECENT_REJECTION_BONUS_PER,
    RECENT_REJECTION_MAX_BONUS,
  );

  const base = previousPremium ?? BASE_STARTING_PREMIUM;
  const next = base + step + scarcityBias + activityBonus - urgencyDiscount;

  return Math.round(clamp(next, MIN_PREMIUM, MAX_PREMIUM));
}

/** Sum of dynamic per-night thresholds for [checkIn, checkOut), advancing and persisting each night's walk. */
async function getDynamicStayThresholdTotal(
  place: DynamicPricingPlace,
  nights: Date[],
): Promise<number> {
  const nightKeys = nights.map(toCalendarDateKey);
  const fromKey = nightKeys[0]!;
  const toKey = nightKeys[nightKeys.length - 1]!;
  const rangeStart = parseBookingDateOnly(fromKey);
  const rangeEnd = addDays(parseBookingDateOnly(toKey), 1);
  const lookbackStart = new Date(
    Date.now() - RECENT_REJECTION_LOOKBACK_HOURS * 60 * 60 * 1000,
  );
  const hotelToday = hotelTodayAsDate(place);

  const [effectiveCaps, acceptedBids, recentRejectedBids, existingStateRows] =
    await Promise.all([
      getEffectiveCapByDate(place.id, place.maxInventory, fromKey, toKey),
      prisma.bid.findMany({
        where: {
          placeId: place.id,
          status: bid_status.ACCEPTED,
          checkInDate: { lt: rangeEnd },
          checkOutDate: { gt: rangeStart },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),
      prisma.bid.findMany({
        where: {
          placeId: place.id,
          status: bid_status.REJECTED,
          createdAt: { gte: lookbackStart },
          checkInDate: { lt: rangeEnd },
          checkOutDate: { gt: rangeStart },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),
      prisma.placeThresholdState.findMany({
        where: { placeId: place.id, date: { gte: rangeStart, lt: rangeEnd } },
        select: { date: true, currentPremium: true },
      }),
    ]);

  const existingByKey = new Map(
    existingStateRows.map((r) => [toCalendarDateKey(r.date), r.currentPremium]),
  );

  let total = 0;
  const upserts: { date: Date; premium: number }[] = [];

  for (const night of nights) {
    const key = toCalendarDateKey(night);
    const floor = getMinimumForNight(place, night);
    const cap = effectiveCaps.get(key) ?? place.maxInventory;
    const accepted = acceptedBids.filter((b) =>
      bidOccupiesNight(b.checkInDate, b.checkOutDate, key),
    ).length;
    const roomsRemaining = Math.max(cap - accepted, 0);
    const recentRejections = recentRejectedBids.filter((b) =>
      bidOccupiesNight(b.checkInDate, b.checkOutDate, key),
    ).length;
    const daysUntilCheckIn = differenceInDays(night, hotelToday);

    const nextPremium = computeNextPremium({
      previousPremium: existingByKey.get(key) ?? null,
      roomsRemaining,
      totalCapacity: cap,
      daysUntilCheckIn,
      recentRejections,
    });

    total += floor + nextPremium;
    upserts.push({ date: night, premium: nextPremium });
  }

  await Promise.all(
    upserts.map(({ date, premium }) =>
      prisma.placeThresholdState.upsert({
        where: { placeId_date: { placeId: place.id, date } },
        create: { placeId: place.id, date, currentPremium: premium },
        update: { currentPremium: premium },
      }),
    ),
  );

  return roundMoney(total);
}

export async function isBidAboveDynamicStayThreshold(
  place: DynamicPricingPlace,
  checkIn: Date,
  checkOut: Date,
  bidPerNight: number,
): Promise<boolean> {
  const nights = getOccupiedNights(checkIn, checkOut);
  if (nights.length === 0) return false;

  const minimumTotal = await getDynamicStayThresholdTotal(place, nights);
  const totalBid = roundMoney(bidPerNight * nights.length);
  return totalBid >= minimumTotal;
}
