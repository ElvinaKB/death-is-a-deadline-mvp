import { bid_status, payment_status, Prisma } from "@prisma/client";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "../libs/config/prisma";
import { toCalendarDateKey } from "../libs/utils/hotelDates";

// Bidding sessions: a member's bids on the same hotel + dates with no gap
// longer than SESSION_GAP_MINUTES. A session's final bid is its "best and
// final" offer; paired with place_exits we know whether they walked away.
export const SESSION_GAP_MINUTES = 30;
// An exit counts for a session if it lands within this window after the
// session's last bid.
const EXIT_WINDOW_HOURS = 3;

export type SessionOutcome = "BOOKED" | "WALKED_AWAY" | "NO_EXIT_RECORDED";

const bidInclude = {
  users: { select: { email: true, raw_user_meta_data: true } },
  place: { select: { name: true, city: true, supplySource: true, retailPrice: true } },
  payment: { select: { status: true } },
} satisfies Prisma.BidInclude;

type BidWithRefs = Prisma.BidGetPayload<{ include: typeof bidInclude }>;

export interface BidSession {
  sessionId: string;
  studentId: string;
  memberName: string | null;
  memberEmail: string | null;
  placeId: string;
  placeName: string;
  city: string;
  supplySource: string;
  checkInDate: string;
  checkOutDate: string;
  startedAt: Date;
  lastBidAt: Date;
  bids: BidWithRefs[];
  firstBidPerNight: number;
  bestBidPerNight: number;
  finalBidPerNight: number;
  outcome: SessionOutcome;
  exitedAt: Date | null;
}

function isPaidBooking(b: BidWithRefs): boolean {
  return (
    b.status === bid_status.ACCEPTED &&
    b.payment?.status === payment_status.CAPTURED
  );
}

export async function loadBidsAndExits(scope: {
  placeId?: string;
  studentId?: string;
  days: number;
}) {
  const since = addDays(new Date(), -scope.days);
  const where = {
    ...(scope.placeId && { placeId: scope.placeId }),
    ...(scope.studentId && { studentId: scope.studentId }),
    createdAt: { gte: since },
  };
  const [bids, exits] = await Promise.all([
    prisma.bid.findMany({ where, include: bidInclude, orderBy: { createdAt: "asc" } }),
    prisma.placeExit
      .findMany({
        where: {
          ...(scope.placeId && { placeId: scope.placeId }),
          ...(scope.studentId && { userId: scope.studentId }),
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
      })
      // Fail open until migration 052 runs.
      .catch(() => []),
  ]);
  return { bids, exits };
}

export function buildSessions(
  bids: BidWithRefs[],
  exits: { userId: string; placeId: string; createdAt: Date }[],
): BidSession[] {
  const groups = new Map<string, BidWithRefs[][]>();
  for (const b of bids) {
    const key = [
      b.studentId,
      b.placeId,
      toCalendarDateKey(b.checkInDate),
      toCalendarDateKey(b.checkOutDate),
    ].join("|");
    const sessions = groups.get(key) ?? [];
    const current = sessions[sessions.length - 1];
    const last = current?.[current.length - 1];
    if (
      current &&
      last &&
      b.createdAt.getTime() - last.createdAt.getTime() <=
        SESSION_GAP_MINUTES * 60_000
    ) {
      current.push(b);
    } else {
      sessions.push([b]);
    }
    groups.set(key, sessions);
  }

  const result: BidSession[] = [];
  for (const sessions of groups.values()) {
    for (const s of sessions) {
      const first = s[0]!;
      const last = s[s.length - 1]!;
      const perNight = s.map((b) => Number(b.bidPerNight));
      const booked = s.some(isPaidBooking);
      const exit = exits.find(
        (e) =>
          e.userId === first.studentId &&
          e.placeId === first.placeId &&
          e.createdAt >= last.createdAt &&
          e.createdAt.getTime() - last.createdAt.getTime() <=
            EXIT_WINDOW_HOURS * 3_600_000,
      );
      const meta = (first.users?.raw_user_meta_data ?? {}) as Record<string, any>;
      result.push({
        sessionId: first.id,
        studentId: first.studentId,
        memberName: meta.name ?? null,
        memberEmail: first.users?.email ?? null,
        placeId: first.placeId,
        placeName: first.place.name,
        city: first.place.city,
        supplySource: first.place.supplySource,
        checkInDate: toCalendarDateKey(first.checkInDate),
        checkOutDate: toCalendarDateKey(first.checkOutDate),
        startedAt: first.createdAt,
        lastBidAt: last.createdAt,
        bids: s,
        firstBidPerNight: perNight[0]!,
        bestBidPerNight: Math.max(...perNight),
        finalBidPerNight: perNight[perNight.length - 1]!,
        outcome: booked ? "BOOKED" : exit ? "WALKED_AWAY" : "NO_EXIT_RECORDED",
        exitedAt: exit?.createdAt ?? null,
      });
    }
  }
  return result.sort((a, b) => b.lastBidAt.getTime() - a.lastBidAt.getTime());
}

function stats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return {
    min: Math.round(sorted[0]!),
    max: Math.round(sorted[sorted.length - 1]!),
    avg: Math.round(avg),
    median: Math.round(median),
  };
}

const LEAD_BUCKETS = [
  { label: "Same day", max: 0 },
  { label: "1–2 days", max: 2 },
  { label: "3–7 days", max: 7 },
  { label: "8+ days", max: Infinity },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Everything for a hotel's data page and GM call. */
export async function getPlaceSummary(placeId: string, days: number) {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: {
      id: true,
      name: true,
      city: true,
      supplySource: true,
      retailPrice: true,
      reservationPhone: true,
      email: true,
      starRating: true,
      guestRating: true,
    },
  });
  if (!place) return null;

  const since = addDays(new Date(), -days);
  const [{ bids, exits }, views, viewers] = await Promise.all([
    loadBidsAndExits({ placeId, days }),
    prisma.placeView
      .count({ where: { placeId, createdAt: { gte: since } } })
      .catch(() => 0),
    prisma.placeView
      .groupBy({ by: ["userId"], where: { placeId, createdAt: { gte: since } } })
      .then((r) => r.length)
      .catch(() => 0),
  ]);
  const sessions = buildSessions(bids, exits);
  const walked = sessions.filter((s) => s.outcome === "WALKED_AWAY");
  const unbooked = sessions.filter((s) => s.outcome !== "BOOKED");
  const booked = sessions.filter((s) => s.outcome === "BOOKED");
  const allBids = bids.map((b) => Number(b.bidPerNight));
  const bookedBids = bids.filter(isPaidBooking);

  const byLead = LEAD_BUCKETS.map((bucket, i) => {
    const min = i === 0 ? -Infinity : LEAD_BUCKETS[i - 1]!.max + 1;
    const inBucket = bids.filter((b) => {
      const lead = differenceInCalendarDays(b.checkInDate, b.createdAt);
      return lead >= min && lead <= bucket.max;
    });
    return {
      label: bucket.label,
      bids: inBucket.length,
      avgBid: stats(inBucket.map((b) => Number(b.bidPerNight)))?.avg ?? null,
    };
  });
  const byWeekday = WEEKDAYS.map((label, d) => {
    const inDay = bids.filter((b) => b.checkInDate.getUTCDay() === d);
    return {
      label,
      bids: inDay.length,
      avgBid: stats(inDay.map((b) => Number(b.bidPerNight)))?.avg ?? null,
    };
  });

  const bidStats = stats(allBids);
  const bestFinal = stats(unbooked.map((s) => s.bestBidPerNight));
  const bidders = new Set(bids.map((b) => b.studentId)).size;
  const pitch =
    bids.length === 0
      ? null
      : `${bidders} member${bidders === 1 ? "" : "s"} bid on ${place.name} in the last ${days} days, offering $${bidStats!.min}–$${bidStats!.max}/night (avg $${bidStats!.avg}). ` +
        `${booked.length} booked` +
        (unbooked.length > 0
          ? `; ${unbooked.length} left without booking — their best offers were $${bestFinal!.min}–$${bestFinal!.max}/night (avg $${bestFinal!.avg}).`
          : ".");

  return {
    place,
    days,
    totals: {
      views,
      uniqueViewers: viewers,
      bids: bids.length,
      bidders,
      sessions: sessions.length,
      booked: booked.length,
      walkedAway: walked.length,
      noExitRecorded: sessions.length - booked.length - walked.length,
      bookedRevenue: Math.round(
        bookedBids.reduce((s, b) => s + Number(b.totalAmount), 0),
      ),
      conversionPct: sessions.length
        ? Math.round((booked.length / sessions.length) * 100)
        : null,
    },
    bidPerNight: bidStats,
    bestFinalUnbooked: bestFinal,
    byLeadTime: byLead,
    byWeekday,
    pitch,
    sessions: sessions.slice(0, 200).map((s) => ({
      sessionId: s.sessionId,
      memberName: s.memberName,
      memberEmail: s.memberEmail,
      checkInDate: s.checkInDate,
      checkOutDate: s.checkOutDate,
      startedAt: s.startedAt,
      lastBidAt: s.lastBidAt,
      bidCount: s.bids.length,
      firstBidPerNight: s.firstBidPerNight,
      bestBidPerNight: s.bestBidPerNight,
      finalBidPerNight: s.finalBidPerNight,
      outcome: s.outcome,
      exitedAt: s.exitedAt,
    })),
  };
}

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per bid, with its session's best-and-final and outcome. */
export async function bidsCsv(scope: {
  placeId?: string;
  studentId?: string;
  days: number;
}): Promise<string> {
  const { bids, exits } = await loadBidsAndExits(scope);
  const sessions = buildSessions(bids, exits);
  const header = [
    "bid_time_utc",
    "member_name",
    "member_email",
    "hotel",
    "city",
    "supply",
    "check_in",
    "check_out",
    "nights",
    "bid_per_night",
    "retail_per_night",
    "bid_status",
    "session_id",
    "bid_number_in_session",
    "is_final_bid",
    "session_best_bid",
    "session_outcome",
    "session_exited_at_utc",
  ];
  const rows: string[] = [header.join(",")];
  const ordered = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  for (const s of ordered) {
    s.bids.forEach((b, i) => {
      rows.push(
        [
          b.createdAt,
          s.memberName,
          s.memberEmail,
          s.placeName,
          s.city,
          s.supplySource,
          s.checkInDate,
          s.checkOutDate,
          b.totalNights,
          Number(b.bidPerNight),
          b.place.retailPrice,
          isPaidBooking(b) ? "BOOKED" : b.status,
          s.sessionId,
          i + 1,
          i === s.bids.length - 1 ? "YES" : "",
          s.bestBidPerNight,
          s.outcome,
          s.exitedAt,
        ]
          .map(csvCell)
          .join(","),
      );
    });
  }
  return rows.join("\n");
}
