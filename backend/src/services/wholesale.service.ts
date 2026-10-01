import {
  AccommodationType,
  bid_status,
  payment_status,
  Place,
  PlaceStatus,
} from "@prisma/client";
import { addDays, differenceInDays, format } from "date-fns";
import { prisma } from "../libs/config/prisma";
import { stripe } from "../libs/config/stripe";
import { sendPlainEmail } from "../email/sendEmail";
import { generateUniquePlaceSlug } from "../libs/utils/placeSlug";
import { toCalendarDateKey } from "../libs/utils/hotelDates";
import {
  book,
  getCheapestOffers,
  getHotelDetails,
  getLiteapiKey,
  isLiteapiSandbox,
  LiteapiError,
  prebook,
  WholesaleOffer,
} from "./liteapi.service";

// Wholesale supply (Nuitee/LiteAPI). Wholesale hotels are imported as real
// Place rows (supplySource = "wholesale") and booked through Nuitee after the
// member's Stripe charge succeeds. Deadline is merchant of record.
export const WHOLESALE_CONFIG = {
  // Off unless WHOLESALE_ENABLED=true: wholesale listings stay hidden from the
  // marketplace and can't be bid on.
  get ENABLED() {
    return process.env.WHOLESALE_ENABLED === "true" && !!getLiteapiKey();
  },
  // Deadline's cut on top of Nuitee's cost. The member price (the "secret
  // price" a bid must reach) = cost × (1 + MARGIN). Covers Stripe's ~3% fee.
  MARGIN: Number(process.env.WHOLESALE_MARGIN ?? 0.04),
  // After this many losing bids on the same hotel + dates, the member is shown
  // the price instead of being left guessing.
  REVEAL_AFTER_LOSING_BIDS: Number(process.env.WHOLESALE_REVEAL_AFTER ?? 3),
  // Go-to-market: California. Each nightly import pulls the hotels that have
  // live availability in these cities. Add a city here to roll out.
  MARKETS: [
    "Los Angeles",
    "Santa Barbara",
    "San Diego",
    "San Francisco",
    "Santa Monica",
    "West Hollywood",
    "Long Beach",
    "Anaheim",
    "Palm Springs",
    "Monterey",
    "Carmel-by-the-Sea",
    "Napa",
    "Sonoma",
    "San Jose",
    "Sacramento",
    "Malibu",
    "Laguna Beach",
    "Newport Beach",
    "Pasadena",
    "South Lake Tahoe",
  ],
  // Bookings + daily summaries go here so the team can call the hotel.
  get NOTIFY_EMAIL() {
    return process.env.WHOLESALE_NOTIFY_EMAIL || "hotels@deadlinetravel.com";
  },
} as const;

export function isWholesale(place: Pick<Place, "supplySource">): boolean {
  return place.supplySource === "wholesale";
}

// ---------- Quotes ----------

export interface WholesaleQuote {
  offer: WholesaleOffer;
  nights: number;
  /** The secret price: a bid at or above this (per night) wins. */
  memberPricePerNight: number;
  memberTotal: number;
  /** Public anchor (Nuitee's suggested selling price), per night. */
  retailPricePerNight: number | null;
  /** Mandatory fees/taxes collected by the hotel at check-in, whole stay. */
  payAtHotel: number;
  payAtHotelNonTax: number;
  refundable: boolean;
}

export async function getWholesaleQuote(
  place: Pick<Place, "liteapiHotelId">,
  checkIn: Date,
  checkOut: Date,
): Promise<WholesaleQuote | null> {
  if (!place.liteapiHotelId) return null;
  const nights = differenceInDays(checkOut, checkIn);
  if (nights < 1) return null;

  const offers = await getCheapestOffers({
    hotelIds: [place.liteapiHotelId],
    checkin: toCalendarDateKey(checkIn),
    checkout: toCalendarDateKey(checkOut),
  });
  const offer = offers.get(place.liteapiHotelId);
  if (!offer) return null;

  return buildQuote(offer, nights);
}

function buildQuote(offer: WholesaleOffer, nights: number): WholesaleQuote {
  // Whole dollars per night, rounded up so the margin is never undercut.
  const memberPricePerNight = Math.ceil(
    (offer.cost * (1 + WHOLESALE_CONFIG.MARGIN)) / nights,
  );
  return {
    offer,
    nights,
    memberPricePerNight,
    memberTotal: memberPricePerNight * nights,
    retailPricePerNight: offer.suggestedSellingPrice
      ? Math.round(offer.suggestedSellingPrice / nights)
      : null,
    payAtHotel: offer.payAtHotel,
    payAtHotelNonTax: offer.payAtHotelNonTax,
    refundable: offer.refundable,
  };
}

// ---------- Import ----------

function stripHtml(html: string | undefined): string {
  return (html || "")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortFrom(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) || "";
  // 100 = the admin edit form's limit, so imported listings stay editable.
  return firstLine.length <= 100 ? firstLine : `${firstLine.slice(0, 97)}...`;
}

function to24h(time?: string): string | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return time;
  let h = Number(m[1]);
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export interface ImportSummary {
  city: string;
  available: number;
  created: number;
  updated: number;
  skippedDirect: number;
  errors: string[];
}

/**
 * Pull every hotel with live availability in a city (checked for tonight and a
 * week out, so midweek-only and weekend-only hotels both make it in), create
 * listings for new ones, and refresh the retail anchor on existing ones.
 * Hotels that have been switched to direct are never touched.
 */
export async function importWholesaleCity(city: string): Promise<ImportSummary> {
  const summary: ImportSummary = {
    city,
    available: 0,
    created: 0,
    updated: 0,
    skippedDirect: 0,
    errors: [],
  };

  const today = new Date();
  const windows = [0, 7].map((offset) => ({
    checkin: format(addDays(today, offset), "yyyy-MM-dd"),
    checkout: format(addDays(today, offset + 1), "yyyy-MM-dd"),
  }));

  const offers = new Map<string, WholesaleOffer>();
  for (const w of windows) {
    try {
      const found = await getCheapestOffers({ cityName: city, ...w });
      for (const [id, offer] of found) if (!offers.has(id)) offers.set(id, offer);
    } catch (err) {
      summary.errors.push(`${w.checkin}: ${(err as Error).message}`);
    }
  }
  summary.available = offers.size;
  if (offers.size === 0) return summary;

  const existing = await prisma.place.findMany({
    where: { liteapiHotelId: { in: [...offers.keys()] } },
    select: { id: true, liteapiHotelId: true, supplySource: true },
  });
  const byHotelId = new Map(existing.map((p) => [p.liteapiHotelId!, p]));

  // New hotels need a details call each; run a few at a time so a big city
  // (LA ≈ 190 hotels) finishes well inside a serverless request.
  const entries = [...offers.entries()];
  const CONCURRENCY = 8;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(
      entries
        .slice(i, i + CONCURRENCY)
        .map(([hotelId, offer]) => upsertHotel(hotelId, offer)),
    );
  }
  return summary;

  async function upsertHotel(hotelId: string, offer: WholesaleOffer) {
    const quote = buildQuote(offer, 1);
    const retailPrice = quote.retailPricePerNight ?? quote.memberPricePerNight;
    const current = byHotelId.get(hotelId);

    try {
      if (current) {
        if (current.supplySource !== "wholesale") {
          summary.skippedDirect++;
          return;
        }
        await prisma.place.update({
          where: { id: current.id },
          data: {
            retailPrice,
            minimumBid: quote.memberPricePerNight,
            wholesaleSyncedAt: new Date(),
          },
        });
        summary.updated++;
        return;
      }

      const d = await getHotelDetails(hotelId);
      const fullDescription = stripHtml(d.hotelDescription) || d.name;
      const images = (d.hotelImages ?? [])
        .sort((a, b) => Number(!!b.defaultImage) - Number(!!a.defaultImage))
        .slice(0, 12)
        .map((img, i) => ({ url: img.urlHd || img.url, order: i }));
      if (images.length === 0 && d.main_photo) {
        images.push({ url: d.main_photo, order: 0 });
      }

      await prisma.place.create({
        data: {
          slug: await generateUniquePlaceSlug(d.name),
          name: d.name,
          shortDescription: shortFrom(fullDescription),
          fullDescription,
          city: d.city || city,
          country: d.country === "US" ? "United States" : d.country || "United States",
          address: d.address || "",
          timezone: "America/Los_Angeles",
          reservationPhone: d.phone || null,
          latitude: d.location?.latitude ?? null,
          longitude: d.location?.longitude ?? null,
          accommodationType: AccommodationType.HOTEL,
          retailPrice,
          minimumBid: quote.memberPricePerNight,
          // Price is checked live against Nuitee on every bid — the stored
          // floor is only a display/analytics snapshot.
          dynamicPricingEnabled: false,
          // Deadline charges the full price (merchant of record).
          commissionOnly: false,
          // Availability is Nuitee's; never cap on our side.
          maxInventory: 99,
          checkInTime: to24h(d.checkinCheckoutTimes?.checkin_start),
          checkOutTime: to24h(d.checkinCheckoutTimes?.checkout),
          goodToKnowText: d.hotelImportantInformation
            ? stripHtml(d.hotelImportantInformation)
            : null,
          status: PlaceStatus.LIVE,
          supplySource: "wholesale",
          liteapiHotelId: hotelId,
          starRating: d.starRating ? Number(d.starRating) : null,
          guestRating: d.rating ? Number(d.rating) : null,
          guestReviewCount: d.reviewCount ? Number(d.reviewCount) : null,
          wholesaleSyncedAt: new Date(),
          images: { create: images },
        },
      });
      summary.created++;
    } catch (err) {
      summary.errors.push(`${hotelId}: ${(err as Error).message}`);
    }
  }
}

export async function importWholesaleMarkets(
  cities: readonly string[] = WHOLESALE_CONFIG.MARKETS,
): Promise<ImportSummary[]> {
  const results: ImportSummary[] = [];
  for (const city of cities) {
    results.push(await importWholesaleCity(city));
  }
  return results;
}

// ---------- Losing-bid reveal ----------

/** Losing bids this member has placed on this hotel for these exact dates. */
export async function countLosingBids(
  placeId: string,
  studentId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<number> {
  return prisma.bid.count({
    where: {
      placeId,
      studentId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: bid_status.REJECTED,
      createdAt: { gt: addDays(new Date(), -2) },
    },
  });
}

// ---------- Fulfilment (after the member's charge succeeds) ----------

/**
 * Lock the room with Nuitee right before charging the member. If the offer the
 * bid was accepted on has expired, re-quote; the new cost must still fit under
 * what the member agreed to pay, otherwise the bid can't be honoured.
 */
export async function prebookForBid(bid: {
  id: string;
  supplierOfferId: string | null;
  totalAmount: unknown;
  checkInDate: Date;
  checkOutDate: Date;
  place: Pick<Place, "liteapiHotelId">;
}): Promise<{ prebookId: string; cost: number; offerId: string }> {
  const total = Number(bid.totalAmount);

  if (bid.supplierOfferId) {
    try {
      const pb = await prebook(bid.supplierOfferId);
      if (pb.price <= total) {
        return { prebookId: pb.prebookId, cost: pb.price, offerId: bid.supplierOfferId };
      }
    } catch (err) {
      console.warn(`[wholesale] prebook of stored offer failed for bid ${bid.id}:`, err);
    }
  }

  const quote = await getWholesaleQuote(bid.place, bid.checkInDate, bid.checkOutDate);
  if (!quote) throw new LiteapiError("Room no longer available", true);
  if (quote.offer.cost > total) {
    throw new LiteapiError("The hotel's price went up since your bid", true);
  }
  const pb = await prebook(quote.offer.offerId);
  if (pb.price > total) {
    throw new LiteapiError("The hotel's price went up since your bid", true);
  }
  return { prebookId: pb.prebookId, cost: pb.price, offerId: quote.offer.offerId };
}

function splitName(name: string | undefined, email: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
  }
  const fallback = parts[0] || email.split("@")[0] || "Guest";
  return { firstName: fallback, lastName: "Guest" };
}

export type FulfilmentResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Book the room with Nuitee for a paid wholesale bid. On failure the member is
 * refunded in full and the bid cancelled — they're never charged for a room
 * that wasn't booked.
 */
export async function fulfilWholesaleBid(bidId: string): Promise<FulfilmentResult> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { place: true, users: true, payment: true },
  });
  if (!bid || !isWholesale(bid.place)) return { ok: true };
  if (bid.supplierBookingId) return { ok: true }; // already booked (webhook retry)

  const email = bid.users?.email || "";
  const meta = (bid.users?.raw_user_meta_data ?? {}) as Record<string, any>;
  const { firstName, lastName } = splitName(meta.name, email);

  try {
    let prebookId = bid.supplierPrebookId;
    let cost = Number(bid.supplierCost ?? 0);
    if (!prebookId) {
      const pb = await prebookForBid(bid);
      prebookId = pb.prebookId;
      cost = pb.cost;
    }

    let result;
    try {
      result = await book(
        prebookId,
        { firstName, lastName, email, ...(meta.phone && { phone: String(meta.phone) }) },
        `deadline-${bid.id}`,
      );
    } catch (err) {
      // A prebook can expire while the member is on the payment form — take a
      // fresh one once and retry.
      const pb = await prebookForBid({ ...bid, supplierOfferId: null });
      cost = pb.cost;
      result = await book(
        pb.prebookId,
        { firstName, lastName, email, ...(meta.phone && { phone: String(meta.phone) }) },
        `deadline-${bid.id}-r`,
      );
    }

    const total = Number(bid.totalAmount);
    await prisma.bid.update({
      where: { id: bid.id },
      data: {
        supplierBookingId: result.bookingId,
        supplierConfirmationCode: result.hotelConfirmationCode,
        supplierStatus: result.status,
        supplierCost: cost,
        // Deadline's margin; Nuitee is paid directly at booking, so nothing is
        // owed to the hotel through the payout queue.
        platformCommission: Math.round((total - cost) * 100) / 100,
        payableToHotel: 0,
        payoutMethod: "nuitee",
        isPaidToHotel: true,
        paidToHotelAt: new Date(),
      },
    });

    // Awaited: on serverless, work after the response may never run.
    await notifyTeamOfWholesaleBooking(bid.id).catch((e) =>
      console.error("[wholesale] booking notification failed:", e),
    );
    return { ok: true };
  } catch (err) {
    const reason = (err as Error).message;
    console.error(`[wholesale] booking failed for bid ${bid.id}:`, err);
    await refundFailedWholesaleBid(bid.id, reason);
    return { ok: false, reason };
  }
}

async function refundFailedWholesaleBid(bidId: string, reason: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { payment: true, place: true },
  });
  if (!bid?.payment?.stripePaymentIntentId) return;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: bid.payment.stripePaymentIntentId,
    });
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: bid.payment.id },
        data: {
          status: payment_status.REFUNDED,
          refundedAt: new Date(),
          stripeRefundId: refund.id,
          adminNotes: `Auto-refunded: wholesale booking failed (${reason})`,
        },
      }),
      prisma.bid.update({
        where: { id: bid.id },
        data: {
          status: bid_status.CANCELLED,
          supplierStatus: "FAILED",
          rejectionReason:
            "We couldn't confirm this room with the hotel, so you've been fully refunded. Sorry about that — please try another hotel.",
        },
      }),
    ]);
  } catch (err) {
    console.error(`[wholesale] REFUND FAILED for bid ${bid.id} — refund manually:`, err);
  }

  await sendPlainEmail({
    to: WHOLESALE_CONFIG.NOTIFY_EMAIL,
    subject: `Wholesale booking FAILED — ${bid.place.name} (auto-refunded)`,
    html: `<p>Nuitee booking failed for bid ${bid.id} at <strong>${bid.place.name}</strong> (${toCalendarDateKey(bid.checkInDate)} → ${toCalendarDateKey(bid.checkOutDate)}).</p><p>Reason: ${reason}</p><p>The member was automatically refunded. Check Stripe if this email says otherwise.</p>`,
  }).catch(() => undefined);
}

/**
 * Tell the team about each wholesale booking, with the hotel's phone and the
 * demand we've seen for it, so Elvina/Christine can call the GM.
 */
export async function notifyTeamOfWholesaleBooking(bidId: string): Promise<void> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { place: true },
  });
  if (!bid) return;

  const since = addDays(new Date(), -30);
  const [bidStats, bookings] = await Promise.all([
    prisma.bid.aggregate({
      where: { placeId: bid.placeId, createdAt: { gt: since } },
      _count: { _all: true },
      _min: { bidPerNight: true },
      _max: { bidPerNight: true },
      _avg: { bidPerNight: true },
    }),
    prisma.bid.count({
      where: {
        placeId: bid.placeId,
        createdAt: { gt: since },
        supplierBookingId: { not: null },
      },
    }),
  ]);

  const money = (v: unknown) => `$${Math.round(Number(v ?? 0))}`;
  const p = bid.place;
  const sandboxNote = isLiteapiSandbox() ? " [SANDBOX — not a real booking]" : "";

  await sendPlainEmail({
    to: WHOLESALE_CONFIG.NOTIFY_EMAIL,
    subject: `Wholesale booking: ${p.name}, ${p.city}${sandboxNote}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:560px;">
        <p style="font-size:16px;"><strong>New wholesale booking — time to call the hotel</strong>${sandboxNote}</p>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse;">
          <tr><td style="color:#64748b;">Hotel</td><td><strong>${p.name}</strong>, ${p.city}</td></tr>
          <tr><td style="color:#64748b;">Hotel phone</td><td>${p.reservationPhone || "—"}</td></tr>
          <tr><td style="color:#64748b;">Stay</td><td>${toCalendarDateKey(bid.checkInDate)} → ${toCalendarDateKey(bid.checkOutDate)} (${bid.totalNights} night${bid.totalNights === 1 ? "" : "s"})</td></tr>
          <tr><td style="color:#64748b;">Member paid</td><td>${money(bid.totalAmount)} (Nuitee cost ${money(bid.supplierCost)}, margin ${money(bid.platformCommission)})</td></tr>
          <tr><td style="color:#64748b;">Hotel confirmation</td><td>${bid.supplierConfirmationCode || "—"}</td></tr>
        </table>
        <p style="font-size:14px;margin-top:12px;"><strong>Last 30 days at this hotel:</strong>
          ${bidStats._count._all} bids, ${money(bidStats._min.bidPerNight)}–${money(bidStats._max.bidPerNight)}/night (avg ${money(bidStats._avg.bidPerNight)}), ${bookings} booked.</p>
        <p style="font-size:13px;color:#475569;">Pitch: lead with the guest and the demand numbers above, then ask for a private member rate direct at 7%. Don't mention Nuitee or their wholesale rate.</p>
      </div>`,
  });
}
