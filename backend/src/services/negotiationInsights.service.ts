import { Prisma } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "../libs/config/prisma";
import { ALERT_MARKER, memberPricePerNight } from "./dealDesk.service";

// Learning loop v1 ("every bid makes the AI smarter"): what each hotel has
// actually done when shown a bid below its secret price. Sources are the
// Deal Desk phone calls Elvina logs and, from now on, Mini Elvina's offers.
// Plain statistics on purpose — enough data for a model comes later.

type Outcome = "YES" | "COUNTER" | "NO";

export interface NegotiationSample {
  placeId: string;
  source: "call" | "offer";
  outcome: Outcome;
  bidPerNight: number;
  floorPerNight: number | null;
  gapPct: number | null;
  /** Price the hotel said yes to, or its counter. */
  resultPerNight: number | null;
  leadTimeDays: number | null;
  at: Date;
}

// How far below the secret price the bid was.
export const GAP_BUCKETS = [
  { label: "0–5%", min: 0, max: 5 },
  { label: "5–10%", min: 5, max: 10 },
  { label: "10–15%", min: 10, max: 15 },
  { label: "15–25%", min: 15, max: 25 },
  { label: "25%+", min: 25, max: Infinity },
] as const;

// Before there is any data, assume about a third of hotels engage.
const STARTING_GUESS = 0.35;
const STARTING_GUESS_WEIGHT = 5;
// How many of a hotel's own answers it takes to outweigh the all-hotel rate.
const HOTEL_WEIGHT = 3;

const round1 = (n: number) => Math.round(n * 10) / 10;

function bucketOf(gapPct: number | null) {
  if (gapPct == null) return null;
  return GAP_BUCKETS.find((b) => gapPct >= b.min && gapPct < b.max) ?? null;
}

function gapBetween(bid: number, floor: number | null) {
  if (floor == null || floor <= 0) return null;
  return Math.max(0, ((floor - bid) / floor) * 100);
}

function offerOutcome(o: {
  status: string;
  counterPerNight: Prisma.Decimal | null;
}): Outcome | null {
  if (o.status === "HOTEL_DECLINED") return "NO";
  if (o.counterPerNight != null) {
    return ["HOTEL_COUNTERED", "MEMBER_DECLINED", "BOOKED", "EXPIRED"].includes(o.status)
      ? "COUNTER"
      : null;
  }
  return ["HOTEL_ACCEPTED", "BOOKED"].includes(o.status) ? "YES" : null;
}

export async function loadNegotiationSamples(placeId?: string): Promise<NegotiationSample[]> {
  const where = placeId ? { placeId } : {};
  const [calls, offers] = await Promise.all([
    prisma.dealCall.findMany({
      where: { ...where, outcome: { in: ["YES", "COUNTER", "NO"] } },
      include: { place: { select: { supplySource: true, minimumBid: true } } },
    }),
    prisma.dealOffer.findMany({
      where: {
        ...where,
        status: {
          in: ["HOTEL_ACCEPTED", "HOTEL_COUNTERED", "HOTEL_DECLINED", "MEMBER_DECLINED", "BOOKED", "EXPIRED"],
        },
      },
    }),
  ]);

  // Calls don't store the secret price, so rebuild it from the bid they were
  // about (wholesale) or the listing (partner hotels; today's value, close
  // enough while floors rarely change).
  const bidIds = calls.map((c) => c.bidId).filter((id): id is string => !!id);
  const bids = bidIds.length
    ? await prisma.bid.findMany({
        where: { id: { in: bidIds } },
        select: { id: true, supplierCost: true, totalNights: true },
      })
    : [];
  const bidById = new Map(bids.map((b) => [b.id, b]));

  const fromCalls = calls.flatMap((c): NegotiationSample[] => {
    if (c.memberBidPerNight == null) return [];
    const bidPerNight = Number(c.memberBidPerNight);
    const bid = c.bidId ? bidById.get(c.bidId) : undefined;
    const floor =
      c.place.supplySource === "wholesale"
        ? bid
          ? memberPricePerNight(bid, c.place)
          : null
        : memberPricePerNight({ supplierCost: null, totalNights: 1 }, c.place);
    return [
      {
        placeId: c.placeId,
        source: "call",
        outcome: c.outcome as Outcome,
        bidPerNight,
        floorPerNight: floor,
        gapPct: gapBetween(bidPerNight, floor),
        resultPerNight: c.amountPerNight != null ? Number(c.amountPerNight) : c.outcome === "YES" ? bidPerNight : null,
        leadTimeDays: c.checkInDate ? differenceInCalendarDays(c.checkInDate, c.createdAt) : null,
        at: c.createdAt,
      },
    ];
  });

  const fromOffers = offers.flatMap((o): NegotiationSample[] => {
    const outcome = offerOutcome(o);
    if (!outcome) return [];
    const bidPerNight = Number(o.bidPerNight);
    const floor = o.floorPerNight != null ? Number(o.floorPerNight) : null;
    return [
      {
        placeId: o.placeId,
        source: "offer",
        outcome,
        bidPerNight,
        floorPerNight: floor,
        gapPct: o.gapPct != null ? Number(o.gapPct) : gapBetween(bidPerNight, floor),
        resultPerNight:
          outcome === "COUNTER"
            ? Number(o.counterPerNight)
            : outcome === "YES"
              ? Number(o.finalPerNight ?? o.bidPerNight)
              : null,
        leadTimeDays: o.leadTimeDays,
        at: o.hotelRespondedAt ?? o.updatedAt,
      },
    ];
  });

  return [...fromCalls, ...fromOffers];
}

function summarize(samples: NegotiationSample[]) {
  const n = samples.length;
  const yes = samples.filter((s) => s.outcome === "YES").length;
  const counter = samples.filter((s) => s.outcome === "COUNTER").length;
  return {
    samples: n,
    yes,
    counter,
    no: n - yes - counter,
    // "Engaged" = the hotel said yes or named a price: a deal was possible.
    engagedPct: n ? Math.round(((yes + counter) / n) * 100) : null,
  };
}

function byBucket(samples: NegotiationSample[]) {
  return GAP_BUCKETS.map((b) => ({
    gap: b.label,
    ...summarize(samples.filter((s) => bucketOf(s.gapPct) === b)),
  }));
}

function median(values: number[]) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

function hotelSummary(samples: NegotiationSample[]) {
  const yesPrices = samples
    .filter((s) => s.outcome === "YES" && s.resultPerNight != null)
    .map((s) => s.resultPerNight!);
  const counterUplifts = samples
    .filter((s) => s.outcome === "COUNTER" && s.resultPerNight != null && s.bidPerNight > 0)
    .map((s) => ((s.resultPerNight! - s.bidPerNight) / s.bidPerNight) * 100);
  const deepestYesGap = samples
    .filter((s) => s.outcome === "YES" && s.gapPct != null)
    .reduce<number | null>((m, s) => (m == null || s.gapPct! > m ? s.gapPct! : m), null);
  const medianUplift = median(counterUplifts);
  return {
    ...summarize(samples),
    lowestYesPerNight: yesPrices.length ? Math.min(...yesPrices) : null,
    deepestYesGapPct: deepestYesGap != null ? round1(deepestYesGap) : null,
    medianCounterAboveBidPct: medianUplift != null ? round1(medianUplift) : null,
    lastAnsweredAt: samples.reduce<Date | null>((m, s) => (m == null || s.at > m ? s.at : m), null),
  };
}

/** Chance a hotel says yes or counters a bid this far below its secret price,
 * blending the hotel's own answers with every hotel's answers at that gap. */
export function estimateEngagement(
  all: NegotiationSample[],
  placeId: string,
  gapPct: number,
  rule?: { autoAcceptFloorPerNight: Prisma.Decimal | null } | null,
  bidPerNight?: number,
) {
  if (
    rule?.autoAcceptFloorPerNight != null &&
    bidPerNight != null &&
    bidPerNight >= Number(rule.autoAcceptFloorPerNight)
  ) {
    return { probabilityPct: 100, basis: "pre-approved by the hotel", hotelSamples: 0, allHotelSamples: 0 };
  }
  const bucket = bucketOf(gapPct);
  const inBucket = all.filter((s) => bucketOf(s.gapPct) === bucket);
  const engaged = (xs: NegotiationSample[]) => xs.filter((s) => s.outcome !== "NO").length;
  const global =
    (engaged(inBucket) + STARTING_GUESS * STARTING_GUESS_WEIGHT) /
    (inBucket.length + STARTING_GUESS_WEIGHT);
  const mine = inBucket.filter((s) => s.placeId === placeId);
  const p = (engaged(mine) + global * HOTEL_WEIGHT) / (mine.length + HOTEL_WEIGHT);
  return {
    probabilityPct: Math.round(p * 100),
    basis: mine.length ? "this hotel's answers" : inBucket.length ? "all hotels' answers" : "starting guess",
    hotelSamples: mine.length,
    allHotelSamples: inBucket.length,
  };
}

/** Admin overview: all-hotel answers by gap, and each hotel's record. */
export async function negotiationInsights() {
  const [samples, rules] = await Promise.all([
    loadNegotiationSamples(),
    prisma.hotelNegotiationRule.findMany(),
  ]);
  const placeIds = [...new Set(samples.map((s) => s.placeId))];
  const places = await prisma.place.findMany({
    where: { id: { in: placeIds } },
    select: { id: true, name: true, city: true, supplySource: true },
  });
  const ruleById = new Map(rules.map((r) => [r.placeId, r]));
  const hotels = places
    .map((p) => {
      const mine = samples.filter((s) => s.placeId === p.id);
      const rule = ruleById.get(p.id);
      return {
        placeId: p.id,
        hotel: p.name,
        city: p.city,
        supplySource: p.supplySource,
        ...hotelSummary(mine),
        byGap: byBucket(mine),
        autoAcceptFloorPerNight:
          rule?.autoAcceptFloorPerNight != null ? Number(rule.autoAcceptFloorPerNight) : null,
      };
    })
    .sort((a, b) => b.samples - a.samples);
  return { overall: { ...summarize(samples), byGap: byBucket(samples) }, hotels };
}

/** One hotel's record plus the odds for a specific bid (what the agent reads
 * before deciding whether, and how, to pitch). */
export async function hotelNegotiationInsight(placeId: string, gapPct?: number, bidPerNight?: number) {
  const [samples, rule] = await Promise.all([
    loadNegotiationSamples(),
    prisma.hotelNegotiationRule.findUnique({ where: { placeId } }),
  ]);
  const mine = samples.filter((s) => s.placeId === placeId);
  return {
    ...hotelSummary(mine),
    byGap: byBucket(mine),
    autoAcceptFloorPerNight:
      rule?.autoAcceptFloorPerNight != null ? Number(rule.autoAcceptFloorPerNight) : null,
    estimate:
      gapPct != null ? estimateEngagement(samples, placeId, gapPct, rule, bidPerNight) : null,
  };
}
