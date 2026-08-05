import { ThresholdPricingMode } from "@prisma/client";
import {
  parseBookingDateOnly,
  toCalendarDateKey,
} from "../libs/utils/hotelDates";

export type ThresholdPricingPlace = {
  minimumBid: number;
  thresholdPricingMode: ThresholdPricingMode;
  minimumBidByDayOfWeek: number[];
};

/** Advance yyyy-MM-dd by one calendar day (UTC). */
function addCalendarDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return toCalendarDateKey(new Date(Date.UTC(y, m - 1, d + 1)));
}

/** Occupied nights for [checkIn, checkOut) — each calendar night guest stays. */
export function getOccupiedNights(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  const checkOutKey = toCalendarDateKey(checkOut);
  let cursorKey = toCalendarDateKey(checkIn);

  while (cursorKey < checkOutKey) {
    nights.push(parseBookingDateOnly(cursorKey));
    cursorKey = addCalendarDay(cursorKey);
  }

  return nights;
}

function resolveWeekdayMinimums(
  place: ThresholdPricingPlace,
): number[] {
  const byDay = place.minimumBidByDayOfWeek;
  if (
    place.thresholdPricingMode === ThresholdPricingMode.PER_WEEKDAY &&
    byDay.length === 7
  ) {
    return byDay.map((value) => Number(value));
  }
  return Array.from({ length: 7 }, () => Number(place.minimumBid));
}

export function getMinimumForNight(
  place: ThresholdPricingPlace,
  nightDate: Date,
): number {
  const weekday = nightDate.getUTCDay();
  return resolveWeekdayMinimums(place)[weekday] ?? Number(place.minimumBid);
}

export function formatThresholdBidRange(
  place: ThresholdPricingPlace,
): { min: number; max: number } {
  const mins = resolveWeekdayMinimums(place);
  return { min: Math.min(...mins), max: Math.max(...mins) };
}

export function buildUniformWeekdayMins(minimumBid: number): number[] {
  return Array.from({ length: 7 }, () => minimumBid);
}

export function resolvePlaceThresholdPayload(data: {
  minimumBid: number;
  thresholdPricingMode?: ThresholdPricingMode;
  minimumBidByDayOfWeek?: number[];
}): {
  minimumBid: number;
  thresholdPricingMode: ThresholdPricingMode;
  minimumBidByDayOfWeek: number[];
} {
  const mode = data.thresholdPricingMode ?? ThresholdPricingMode.UNIFORM;

  if (
    mode === ThresholdPricingMode.PER_WEEKDAY &&
    data.minimumBidByDayOfWeek?.length === 7
  ) {
    const mins = data.minimumBidByDayOfWeek.map(Number);
    return {
      minimumBid: Math.min(...mins),
      thresholdPricingMode: mode,
      minimumBidByDayOfWeek: mins,
    };
  }

  const uniform = buildUniformWeekdayMins(data.minimumBid);
  return {
    minimumBid: data.minimumBid,
    thresholdPricingMode: ThresholdPricingMode.UNIFORM,
    minimumBidByDayOfWeek: uniform,
  };
}

export function validatePlaceThresholdPricing(params: {
  retailPrice: number;
  minimumBid: number;
  thresholdPricingMode: ThresholdPricingMode;
  minimumBidByDayOfWeek: number[];
}): void {
  const { retailPrice, thresholdPricingMode, minimumBidByDayOfWeek, minimumBid } =
    params;

  if (thresholdPricingMode === ThresholdPricingMode.PER_WEEKDAY) {
    if (minimumBidByDayOfWeek.length !== 7) {
      throw new Error("All 7 weekday minimum bids are required");
    }
    for (const value of minimumBidByDayOfWeek) {
      if (value < 0 || value >= retailPrice) {
        throw new Error("Each weekday minimum must be less than retail price");
      }
    }
    return;
  }

  if (minimumBid >= retailPrice) {
    throw new Error("Minimum bid must be less than retail price");
  }
}
