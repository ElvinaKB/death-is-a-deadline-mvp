import { bid_status, PlaceStatus, Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import { prisma } from "../libs/config/prisma";
import { toCalendarDateKey } from "../libs/utils/hotelDates";
import { buildSessions, loadBidsAndExits } from "./analytics.service";
import { WHOLESALE_CONFIG } from "./wholesale.service";
import { sendPlainEmail } from "../email/sendEmail";

// Deal desk (Stage 1, human calls): members whose best-and-final bid fell a
// little short of a hotel's secret price, so Elvina can call the hotel and ask
// it to take the member's number. The gap to the secret price is internal —
// for wholesale it comes from Nuitee's rate, which is never shared with hotels.

export const DEAL_OUTCOMES = [
  "YES",
  "COUNTER",
  "NO",
  "NO_ANSWER",
  "CONTACT_CAPTURED",
] as const;
export type DealOutcome = (typeof DEAL_OUTCOMES)[number];

// Internal row marking "the near-miss email already went out for this bid".
// Never shown as a call or counted in the scoreboard.
export const ALERT_MARKER = "EMAIL_ALERT";

export function memberPricePerNight(
  bid: { supplierCost: unknown; totalNights: number },
  place: { supplySource: string; minimumBid: number },
): number | null {
  if (place.supplySource === "wholesale") {
    const cost = Number(bid.supplierCost);
    if (!Number.isFinite(cost) || cost <= 0 || !bid.totalNights) return null;
    return Math.ceil((cost * (1 + WHOLESALE_CONFIG.MARGIN)) / bid.totalNights);
  }
  return place.minimumBid > 0 ? place.minimumBid : null;
}

export async function dealQueue(opts: {
  days: number;
  maxGapPct: number;
  includeCalled: boolean;
}) {
  const { bids, exits } = await loadBidsAndExits({ days: opts.days });
  const sessions = buildSessions(bids, exits).filter(
    (s) =>
      s.outcome !== "BOOKED" &&
      // Won (or Book now) but left at payment — not a price problem.
      !s.bids.some((b) => b.status === bid_status.ACCEPTED),
  );
  const today = toCalendarDateKey(new Date());
  const live = sessions.filter((s) => s.checkOutDate > today);
  if (live.length === 0) return [];

  const placeIds = [...new Set(live.map((s) => s.placeId))];
  const [places, contacts, calls] = await Promise.all([
    prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        supplySource: true,
        minimumBid: true,
        timezone: true,
        retailPrice: true,
        status: true,
      },
    }),
    prisma.hotelContact.findMany({ where: { placeId: { in: placeIds } } }),
    prisma.dealCall.findMany({
      where: { placeId: { in: placeIds }, outcome: { not: ALERT_MARKER } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const placeById = new Map(places.map((p) => [p.id, p]));
  const contactById = new Map(contacts.map((c) => [c.placeId, c]));

  const rows = live.flatMap((s) => {
    const place = placeById.get(s.placeId);
    if (!place || place.status !== PlaceStatus.LIVE) return [];
    const best = s.bids.reduce((a, b) =>
      Number(b.bidPerNight) > Number(a.bidPerNight) ? b : a,
    );
    const member = memberPricePerNight(best, place);
    const gapPct =
      member != null ? Math.max(0, ((member - s.bestBidPerNight) / member) * 100) : null;
    if (gapPct != null && gapPct > opts.maxGapPct) return [];
    const sessionBidIds = new Set(s.bids.map((b) => b.id));
    const sessionCalls = calls.filter(
      (c) =>
        (c.bidId && sessionBidIds.has(c.bidId)) ||
        (c.memberId === s.studentId &&
          c.checkInDate &&
          toCalendarDateKey(c.checkInDate) === s.checkInDate),
    );
    if (!opts.includeCalled && sessionCalls.length > 0) return [];
    return [
      {
        sessionId: s.sessionId,
        bestBidId: best.id,
        memberId: s.studentId,
        memberFirstName: (s.memberName ?? "").trim().split(/\s+/)[0] || "Member",
        memberName: s.memberName,
        memberEmail: s.memberEmail,
        placeId: place.id,
        slug: place.slug,
        hotel: place.name,
        city: place.city,
        supplySource: place.supplySource,
        timezone: place.timezone,
        publicPricePerNight: place.retailPrice,
        checkInDate: s.checkInDate,
        checkOutDate: s.checkOutDate,
        nights: best.totalNights,
        bestBidPerNight: s.bestBidPerNight,
        bidsInSession: s.bids.length,
        lastBidAt: s.lastBidAt,
        walkedAway: s.outcome === "WALKED_AWAY",
        // Partner hotels keep the member's card; wholesale is paid via Nuitée.
        cardOnFile: place.supplySource === "direct",
        memberPricePerNight: member,
        gapPct: gapPct != null ? Math.round(gapPct * 10) / 10 : null,
        contact: contactById.get(place.id) ?? null,
        lastCall: sessionCalls[0] ?? null,
      },
    ];
  });

  // Tonight first, then smallest gap (unknown gaps last), then newest.
  return rows.sort((a, b) => {
    const ta = a.checkInDate <= today ? 0 : 1;
    const tb = b.checkInDate <= today ? 0 : 1;
    if (ta !== tb) return ta - tb;
    const ga = a.gapPct ?? 999;
    const gb = b.gapPct ?? 999;
    if (ga !== gb) return ga - gb;
    return b.lastBidAt.getTime() - a.lastBidAt.getTime();
  });
}

export async function hotelDealHistory(placeId: string) {
  const [contact, calls] = await Promise.all([
    prisma.hotelContact.findUnique({ where: { placeId } }),
    prisma.dealCall.findMany({
      where: { placeId, outcome: { not: ALERT_MARKER } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return { contact, calls };
}

export async function saveHotelContact(
  placeId: string,
  data: { name?: string; role?: string; phone?: string; email?: string; notes?: string },
) {
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : null]),
  ) as Prisma.HotelContactUncheckedCreateInput;
  return prisma.hotelContact.upsert({
    where: { placeId },
    create: { ...clean, placeId },
    update: clean,
  });
}

/** Record (or withdraw) the decision-maker's consent to deal texts. */
export async function setHotelSmsConsent(placeId: string, consent: boolean, source: string) {
  return prisma.hotelContact.upsert({
    where: { placeId },
    create: consent
      ? { placeId, smsConsentAt: new Date(), smsOptedOutAt: null, consentSource: source }
      : { placeId, smsOptedOutAt: new Date(), consentSource: source },
    update: consent
      ? { smsConsentAt: new Date(), smsOptedOutAt: null, consentSource: source }
      : { smsOptedOutAt: new Date(), consentSource: source },
  });
}

/** Standing instruction: accept bids at or above this per-night price. */
export async function saveNegotiationRule(
  placeId: string,
  data: { autoAcceptFloorPerNight: number | null; approvedVia: string; notes?: string | null },
) {
  const fields = {
    autoAcceptFloorPerNight: data.autoAcceptFloorPerNight,
    approvedVia: data.approvedVia,
    approvedAt: data.autoAcceptFloorPerNight != null ? new Date() : null,
    notes: data.notes?.trim() || null,
  };
  return prisma.hotelNegotiationRule.upsert({
    where: { placeId },
    create: { placeId, ...fields },
    update: fields,
  });
}

export async function logDealCall(data: {
  placeId: string;
  bidId?: string | null;
  memberId?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  memberBidPerNight?: number | null;
  outcome: DealOutcome;
  amountPerNight?: number | null;
  reason?: string | null;
  notes?: string | null;
  directLead?: boolean;
  callbackAt?: string | null;
}) {
  const day = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00.000Z`) : null);
  return prisma.dealCall.create({
    data: {
      placeId: data.placeId,
      bidId: data.bidId ?? null,
      memberId: data.memberId ?? null,
      checkInDate: day(data.checkInDate),
      checkOutDate: day(data.checkOutDate),
      memberBidPerNight: data.memberBidPerNight ?? null,
      outcome: data.outcome,
      amountPerNight: data.amountPerNight ?? null,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      directLead: !!data.directLead,
      callbackAt: data.callbackAt ? new Date(data.callbackAt) : null,
    },
  });
}

export async function dealStats(days: number) {
  const since = addDays(new Date(), -days);
  const calls = await prisma.dealCall.findMany({
    where: { createdAt: { gte: since }, outcome: { not: ALERT_MARKER } },
  });
  const reached = calls.filter((c) => c.outcome !== "NO_ANSWER");
  const yes = calls.filter((c) => c.outcome === "YES");
  const counters = calls.filter(
    (c) => c.outcome === "COUNTER" && c.amountPerNight != null && c.memberBidPerNight != null,
  );
  const avgCounterGap = counters.length
    ? Math.round(
        counters.reduce(
          (s, c) => s + (Number(c.amountPerNight) - Number(c.memberBidPerNight)),
          0,
        ) / counters.length,
      )
    : null;
  const withContact = await prisma.hotelContact.count({
    where: { OR: [{ name: { not: null } }, { email: { not: null } }] },
  });
  return {
    calls: calls.length,
    reachRatePct: calls.length ? Math.round((reached.length / calls.length) * 100) : null,
    yesRatePct: reached.length ? Math.round((yes.length / reached.length) * 100) : null,
    yes: yes.length,
    counters: counters.length,
    avgCounterAboveBid: avgCounterGap,
    decisionMakers: withContact,
    directLeads: new Set(calls.filter((c) => c.directLead).map((c) => c.placeId)).size,
  };
}

/** Nearby live hotels whose member price (last nightly snapshot) fits the
 * member's budget — something to offer when a hotel says no. */
export async function dealAlternatives(placeId: string, maxPerNight: number) {
  const origin = await prisma.place.findUnique({
    where: { id: placeId },
    select: { latitude: true, longitude: true },
  });
  if (origin?.latitude == null || origin.longitude == null) return [];
  const d = 0.06; // ~5–6 km box
  const nearby = await prisma.place.findMany({
    where: {
      id: { not: placeId },
      status: PlaceStatus.LIVE,
      latitude: { gte: origin.latitude - d, lte: origin.latitude + d },
      longitude: { gte: origin.longitude - d, lte: origin.longitude + d },
      minimumBid: { lte: maxPerNight, gt: 0 },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      supplySource: true,
      minimumBid: true,
      retailPrice: true,
      latitude: true,
      longitude: true,
      starRating: true,
      guestRating: true,
    },
  });
  const km = (lat: number, lng: number) =>
    Math.hypot(
      (lat - origin.latitude!) * 111,
      (lng - origin.longitude!) * 111 * Math.cos((origin.latitude! * Math.PI) / 180),
    );
  return nearby
    .map((p) => ({ ...p, km: Math.round(km(p.latitude!, p.longitude!) * 10) / 10 }))
    .sort((a, b) => Number(b.supplySource === "direct") - Number(a.supplySource === "direct") || a.km - b.km)
    .slice(0, 6);
}

// ---------- Near-miss email (runs every ~10 min from GitHub Actions) ----------

const NEAR_MISS_MAX_GAP_PCT = Number(process.env.NEAR_MISS_MAX_GAP_PCT ?? 10);
const NEAR_MISS_QUIET_MIN = 30; // wait this long after the member's last bid
const NEAR_MISS_MAX_AGE_H = 12; // don't alert on stale sessions

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );

/**
 * Email hotels@ about members who stopped bidding 30+ minutes ago without
 * booking and were close to the secret price. Server-side bids only, so it
 * works whether or not the member accepted cookies. Each session once.
 */
export async function sendNearMissAlerts(): Promise<{ sent: number }> {
  const now = Date.now();
  const rows = (
    await dealQueue({ days: 2, maxGapPct: NEAR_MISS_MAX_GAP_PCT, includeCalled: false })
  ).filter((r) => {
    const age = now - r.lastBidAt.getTime();
    return (
      r.gapPct != null &&
      age >= NEAR_MISS_QUIET_MIN * 60_000 &&
      age <= NEAR_MISS_MAX_AGE_H * 3_600_000
    );
  });
  if (rows.length === 0) return { sent: 0 };

  const already = await prisma.dealCall.findMany({
    where: { outcome: ALERT_MARKER, bidId: { in: rows.map((r) => r.bestBidId) } },
    select: { bidId: true },
  });
  const done = new Set(already.map((a) => a.bidId));
  const fresh = rows.filter((r) => !done.has(r.bestBidId));
  if (fresh.length === 0) return { sent: 0 };

  const money = (n: number | null) => (n == null ? "—" : `$${Math.round(n)}`);
  const lines = fresh
    .map(
      (r) => `<tr>
  <td style="padding:6px 8px;border-top:1px solid #ddd"><strong>${esc(r.hotel)}</strong><br/><span style="color:#666">${esc(r.city)} · ${r.supplySource === "wholesale" ? "Wholesale" : "Partner"}${r.contact?.phone ? ` · ${esc(r.contact.phone)}` : ""}</span></td>
  <td style="padding:6px 8px;border-top:1px solid #ddd">${esc(r.memberName ?? r.memberFirstName)}<br/><span style="color:#666">${esc(r.memberEmail)}</span></td>
  <td style="padding:6px 8px;border-top:1px solid #ddd">${esc(r.checkInDate)} → ${esc(r.checkOutDate)} (${r.nights}n)</td>
  <td style="padding:6px 8px;border-top:1px solid #ddd">${money(r.bestBidPerNight)}/night<br/><span style="color:#666">${r.bidsInSession} bid${r.bidsInSession === 1 ? "" : "s"}${r.walkedAway ? " · left the page" : ""}</span></td>
  <td style="padding:6px 8px;border-top:1px solid #ddd">${money(r.memberPricePerNight)} · <strong>${r.gapPct}% short</strong></td>
</tr>`,
    )
    .join("");

  await sendPlainEmail({
    to: WHOLESALE_CONFIG.NOTIFY_EMAIL,
    subject: `Near miss: ${fresh.length === 1 ? `${fresh[0]!.hotel} — ${fresh[0]!.gapPct}% short` : `${fresh.length} members just missed`}`,
    html: `<p style="font-size:15px"><strong>Go time.</strong> ${fresh.length === 1 ? "A member" : `${fresh.length} members`} stopped bidding 30+ minutes ago without booking, close to the secret price.</p>
<table style="border-collapse:collapse;font-size:13px">
<tr style="text-align:left;color:#666"><th style="padding:6px 8px">Hotel</th><th style="padding:6px 8px">Member</th><th style="padding:6px 8px">Stay</th><th style="padding:6px 8px">Best bid</th><th style="padding:6px 8px">Secret price</th></tr>
${lines}
</table>
<p><a href="https://www.deadlinetravel.com/admin/deal-desk">Open the Deal desk →</a></p>
<p style="color:#888;font-size:12px">Internal only. On a call, quote the member's bid — never the secret price or the % gap (for wholesale those come from Nuitée's rates).</p>`,
  });

  await prisma.dealCall.createMany({
    data: fresh.map((r) => ({
      placeId: r.placeId,
      bidId: r.bestBidId,
      memberId: r.memberId,
      outcome: ALERT_MARKER,
    })),
  });
  return { sent: fresh.length };
}
