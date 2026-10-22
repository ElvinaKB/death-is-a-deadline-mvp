// Demand analytics for a single listing — the "willingness to pay" data the
// hotel RMS co-pilot (and the admin data page) render. Shape mirrors the
// backend getPlaceSummary() response.

export interface BidStat {
  min: number;
  max: number;
  avg: number;
}

export interface BucketStat {
  label: string;
  bids: number;
  avgBid: number | null;
}

export type SessionOutcome = "BOOKED" | "WALKED_AWAY" | "NO_EXIT_RECORDED";

export interface PlaceSummarySession {
  sessionId: string;
  // Privacy-preserving: the hotel sees a first name + a verification label
  // (school/company), never the full name or email. `memberKey` is an opaque
  // stable id so sessions still group per member.
  memberKey: string;
  firstName: string;
  verifiedVia: string;
  checkInDate: string;
  checkOutDate: string;
  startedAt: string;
  lastBidAt: string;
  bidCount: number;
  firstBidPerNight: number;
  bestBidPerNight: number;
  finalBidPerNight: number;
  outcome: SessionOutcome;
  exitedAt: string | null;
}

export interface PlaceSummary {
  place: {
    id: string;
    name: string;
    city: string | null;
    supplySource: string;
    retailPrice: number;
    reservationPhone: string | null;
    email: string | null;
    starRating: number | null;
    guestRating: number | null;
  };
  days: number;
  totals: {
    views: number;
    uniqueViewers: number;
    bids: number;
    bidders: number;
    sessions: number;
    booked: number;
    walkedAway: number;
    noExitRecorded: number;
    bookedRevenue: number;
    conversionPct: number | null;
  };
  bidPerNight: BidStat | null;
  bestFinalUnbooked: BidStat | null;
  byLeadTime: BucketStat[];
  byWeekday: BucketStat[];
  pitch: string | null;
  sessions: PlaceSummarySession[];
}

export interface PlaceSummaryResponse {
  data: PlaceSummary;
}
