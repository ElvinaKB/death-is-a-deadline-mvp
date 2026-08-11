import { Router, Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { bid_status, Prisma } from "@prisma/client";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
} from "date-fns";
import { parseBookingDateOnly } from "../libs/utils/hotelDates";
import { Redis } from "@upstash/redis";
import {
  notifyBookingConfirmed,
  notifyBookingCancelled,
} from "../services/myallocatorNotify.service";

// Cloudbeds OTA Build-To-Us API (myallocator).
// Spec: https://developers.cloudbeds.com/reference/ota-build-to-us-introduction
//
// Every call is a POST with a JSON body (never a 4xx/5xx for business
// errors — failures are conveyed via `success:false` + `errors` in a 200).
// Error codes: https://apidocs.myallocator.com/ota-errors.html

export const router = Router();

// Self-cert debugging aid: stash the last sandbox payload per verb in Redis
// (Vercel is stateless, so we can't hold it in memory) so we can read back
// exactly what the certification tool sent. Best-effort, sandbox-only.
const sandboxRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function captureSandbox(verb: string, body: unknown) {
  try {
    await sandboxRedis?.set(`myalloc:sandbox:last:${verb}`, body, { ex: 3600 });
  } catch {
    // never block the cert flow on a capture failure
  }
}

const ERROR = {
  LOGIN: 1001, // FAULT.OTA.LOGIN - invalid credentials / shared_secret
  NOTENABLED: 1002, // FAULT.OTA.NOTENABLED
  OFFLINE: 1003, // FAULT.OTA.OFFLINE
  NO_SUCH_BOOKING: 30, // MAAPI.GENERIC.NO_SUCH_BOOKING
};

function fail(res: Response, id: number, msg: string) {
  return res.json({ success: false, errors: [{ id, msg }] });
}

// `shared_secret` is issued by Cloudbeds once the partnership/credentialing
// form is approved (not yet in hand at the time this router was written).
// Until MYALLOCATOR_SHARED_SECRET is set, every call fails closed with a
// LOGIN error rather than silently accepting unauthenticated requests.
function hasValidSharedSecret(body: Record<string, unknown>): boolean {
  const expected = process.env.MYALLOCATOR_SHARED_SECRET;
  return Boolean(expected) && body?.shared_secret === expected;
}

// Reserved property id for myallocator self-certification. It maps to NO real
// listing, so cert ARI pushes / test bookings can never touch live inventory.
// Connect the test property with Hotel Id = "dln-sandbox" (password ignored).
export const SANDBOX_PROPERTY_ID = "dln-sandbox";

interface OtaPlace {
  id: string;
  slug: string;
  name: string;
  accommodationType: string;
}

// Deadline models one bookable unit type per Place (no separate room-type
// table), so `ota_room_id` / `ota_property_id` map 1:1 to `Place.slug`.
async function findPlaceByOtaId(otaPropertyId: unknown): Promise<OtaPlace | null> {
  if (typeof otaPropertyId !== "string" || !otaPropertyId) return null;
  if (otaPropertyId === SANDBOX_PROPERTY_ID) {
    return {
      id: SANDBOX_PROPERTY_ID,
      slug: SANDBOX_PROPERTY_ID,
      name: "Deadline Sandbox (test)",
      accommodationType: "HOTEL",
    };
  }
  return prisma.place.findUnique({ where: { slug: otaPropertyId } });
}

// Synthetic booking served for the self-cert sandbox (polling path). The
// sandbox property has no real bids, so we return one well-formed test booking
// so GetBookingList/GetBookingId can be certified. Format mirrors the real
// GetBookingId body below.
const SANDBOX_BOOKING_ID = "dln-sandbox-booking-1";
const SANDBOX_CANCEL_BOOKING_ID = "dln-sandbox-cancel-1";

function buildSandboxBooking(orderId: string, isCancellation: boolean) {
  const checkInStr = "2026-08-01";
  const checkIn = new Date(`${checkInStr}T00:00:00Z`);
  const nights = 2;
  const rate = 100;
  const dayRates = Array.from({ length: nights }, (_, i) => ({
    Date: format(addDays(checkIn, i), "yyyy-MM-dd"),
    Description: "Deadline Threshold Rate",
    Rate: rate,
    Currency: "USD",
    RateId: "default",
  }));
  return {
    OrderId: orderId,
    OrderDate: "2026-07-26",
    OrderTime: "12:00:00",
    IsCancellation: isCancellation ? 1 : 0,
    IsModification: 0,
    OrderAdults: 1,
    OrderChildren: 0,
    OrderCustomers: 1,
    TotalCurrency: "USD",
    TotalPrice: rate * nights,
    PaymentCollect: "Channel",
    Customers: [
      {
        CustomerCountry: "US",
        CustomerEmail: "sandbox@deadlinetravel.com",
        CustomerFName: "Sandbox",
        CustomerLName: "Tester",
      },
    ],
    Rooms: [
      {
        ChannelRoomType: "dln-sandbox-2",
        Currency: "USD",
        Adults: 1,
        Babies: 0,
        Children: 0,
        Occupancy: 1,
        RateDesc: "Deadline Threshold Rate",
        RateId: "default",
        DayRates: dayRates,
        StartDate: checkInStr,
        EndDate: format(addDays(checkIn, nights - 1), "yyyy-MM-dd"),
        Price: rate * nights,
        Units: 1,
      },
    ],
  };
}

router.post("/HealthCheck", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  return res.json({ success: true });
});

// Validates ota_property_id/ota_property_password against a Deadline Place.
// NOTE: Deadline doesn't yet store a per-hotel channel password, so any
// non-empty password is currently accepted once the property slug matches.
// This is fine for credentialing against test properties, but should be
// tightened (real per-hotel secret) before any live hotel self-serves a
// channel connection.
router.post("/SetupProperty", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }
  return res.json({ success: true });
});

router.post("/GetRoomTypes", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }
  // Self-cert requires >= 2 room types; the sandbox exposes two synthetic
  // rooms to satisfy it (real listings model one unit type per Place).
  if (place.id === SANDBOX_PROPERTY_ID) {
    return res.json({
      success: true,
      Rooms: [
        { ota_room_id: "dln-sandbox", title: "Deadline Sandbox Room A", dorm: false },
        { ota_room_id: "dln-sandbox-2", title: "Deadline Sandbox Room B", dorm: false },
      ],
    });
  }
  return res.json({
    success: true,
    Rooms: [
      {
        ota_room_id: place.slug,
        title: place.name,
        dorm: place.accommodationType === "HOSTEL",
      },
    ],
  });
});

router.post("/GetRatePlans", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }
  // Sandbox exposes a rate plan per synthetic room for self-certification.
  if (place.id === SANDBOX_PROPERTY_ID) {
    return res.json({
      success: true,
      RatePlans: [
        { ota_room_id: "dln-sandbox", ota_rate_id: "default", title: "Deadline Threshold Rate" },
        { ota_room_id: "dln-sandbox-2", ota_rate_id: "default", title: "Deadline Threshold Rate" },
      ],
    });
  }
  return res.json({
    success: true,
    RatePlans: [
      {
        ota_room_id: place.slug,
        ota_rate_id: "default",
        title: "Deadline Threshold Rate",
      },
    ],
  });
});

// Cloudbeds pushes ARI (availability/rates/restrictions) to us here. Deadline's
// model is availability-driven: we persist only the per-date `units`
// (availability) at the room/place level and deliberately ignore the pushed
// rate (the hotel's threshold "secret" rate in our dashboard wins), occupancy
// pricing, and booking-offset restrictions. Stored units become a live ceiling
// on biddable inventory: available = min(place.maxInventory, units) - accepted
// bids (see inventory.service.ts).
router.post("/ARIUpdate", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }

  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }

  // Sandbox self-cert property: accept the push but never persist, so
  // certification can't alter any real listing's inventory. Capture the
  // payload so we can read exactly what the cert sent.
  if (place.id === SANDBOX_PROPERTY_ID) {
    await captureSandbox("ARIUpdate", req.body);
    return res.json({ success: true });
  }

  // Flatten the Inventory array into one (date, units) row per calendar day.
  // Cloudbeds only supports room-level availability, so we key on place/date
  // and ignore ota_room_id/ota_rate_id distinctions.
  const inventory = Array.isArray(req.body?.Inventory) ? req.body.Inventory : [];
  const rows: { date: string; units: number }[] = [];

  for (const item of inventory) {
    const units = Number(item?.units);
    if (!item?.start_date || !item?.end_date || !Number.isFinite(units)) {
      // Skip malformed items rather than failing the whole push.
      console.warn("[ARIUpdate] skipping malformed inventory item", item);
      continue;
    }
    try {
      const start = parseBookingDateOnly(item.start_date);
      const end = parseBookingDateOnly(item.end_date); // inclusive
      if (start > end) continue;
      for (const day of eachDayOfInterval({ start, end })) {
        rows.push({ date: format(day, "yyyy-MM-dd"), units: Math.max(0, Math.trunc(units)) });
      }
    } catch (err) {
      console.warn("[ARIUpdate] skipping item with unparseable dates", item, err);
    }
  }

  if (rows.length === 0) {
    return res.json({ success: true });
  }

  // Last-write-wins per date within this payload (later items override earlier).
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, r.units);
  const deduped = [...byDate.entries()];

  try {
    // Bulk upsert in chunks to stay well under Postgres' parameter limit.
    const CHUNK = 500;
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const chunk = deduped.slice(i, i + CHUNK);
      const values = chunk.map(
        ([date, units]) =>
          Prisma.sql`(${place.id}, ${date}::date, ${units}, 'cloudbeds', now())`,
      );
      await prisma.$executeRaw`
        INSERT INTO public.place_channel_availability (place_id, date, units, source, updated_at)
        VALUES ${Prisma.join(values)}
        ON CONFLICT (place_id, date)
        DO UPDATE SET units = EXCLUDED.units, updated_at = now()
      `;
    }
  } catch (err) {
    // Storage failure: return a retryable OFFLINE error (200 body, not a 5xx)
    // so Cloudbeds re-sends rather than assuming the availability applied.
    console.error("[ARIUpdate] failed to persist availability", err);
    return fail(res, ERROR.OFFLINE, "Temporarily unable to store availability.");
  }

  return res.json({ success: true });
});

router.post("/GetBookingList", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }

  if (place.id === SANDBOX_PROPERTY_ID) {
    return res.json({
      success: true,
      Bookings: [
        { booking_id: SANDBOX_BOOKING_ID, version: "2026-07-26T12:00:00.000Z" },
        {
          booking_id: SANDBOX_CANCEL_BOOKING_ID,
          version: "2026-07-26T12:30:00.000Z",
        },
      ],
    });
  }

  const otaBookingVersion = req.body?.ota_booking_version;
  const since =
    typeof otaBookingVersion === "string" && otaBookingVersion
      ? addDays(new Date(`${otaBookingVersion.replace(" ", "T")}Z`), 0)
      : null;
  if (since) since.setUTCMinutes(since.getUTCMinutes() - 5);

  const bids = await prisma.bid.findMany({
    where: {
      placeId: place.id,
      // CANCELLED is included so a cancelled booking still surfaces here —
      // that's how Cloudbeds finds out to reopen the room (see GetBookingId
      // below, which reports IsCancellation for it).
      status: { in: [bid_status.ACCEPTED, bid_status.CANCELLED] },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    select: { id: true, updatedAt: true },
  });

  return res.json({
    success: true,
    Bookings: bids.map((bid) => ({
      booking_id: bid.id,
      version: bid.updatedAt.toISOString(),
    })),
  });
});

router.post("/GetBookingId", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }

  const bookingId = req.body?.booking_id;
  if (typeof bookingId !== "string" || !bookingId) {
    return fail(res, ERROR.NO_SUCH_BOOKING, "No such booking id.");
  }

  if (place.id === SANDBOX_PROPERTY_ID) {
    // Report a cancellation only when the cert asks for the reserved
    // cancellation id; otherwise return the standard synthetic booking.
    const isCancellation = bookingId.includes("cancel");
    return res.json({
      success: true,
      Booking: buildSandboxBooking(bookingId, isCancellation),
    });
  }

  const bid = await prisma.bid.findFirst({
    where: {
      id: bookingId,
      placeId: place.id,
      status: { in: [bid_status.ACCEPTED, bid_status.CANCELLED] },
    },
    include: {
      users: { select: { email: true, phone: true, raw_user_meta_data: true } },
    },
  });
  if (!bid) {
    return fail(res, ERROR.NO_SUCH_BOOKING, "No such booking id.");
  }

  const guestName =
    (bid.users.raw_user_meta_data as { name?: string } | null)?.name ||
    "Guest";
  const [firstName, ...rest] = guestName.split(" ");
  const lastName = rest.join(" ") || firstName;

  const checkIn = bid.checkInDate;
  const lastNight = addDays(bid.checkOutDate, -1);
  const nights = Math.max(
    1,
    differenceInCalendarDays(bid.checkOutDate, bid.checkInDate),
  );
  const dayRates = Array.from({ length: nights }, (_, i) => ({
    Date: format(addDays(checkIn, i), "yyyy-MM-dd"),
    Description: "Deadline Threshold Rate",
    Rate: Number(bid.bidPerNight),
    Currency: "USD",
    RateId: "default",
  }));

  return res.json({
    success: true,
    Booking: {
      OrderId: bid.id,
      OrderDate: format(bid.createdAt, "yyyy-MM-dd"),
      OrderTime: format(bid.createdAt, "HH:mm:ss"),
      IsCancellation: bid.status === bid_status.CANCELLED ? 1 : 0,
      IsModification: 0,
      // Deadline doesn't currently collect a guest/occupant count at bid
      // time, so we report a single adult per booking until that's added.
      OrderAdults: 1,
      OrderChildren: 0,
      OrderCustomers: 1,
      TotalCurrency: "USD",
      TotalPrice: Number(bid.totalAmount),
      // Deadline charges the traveler directly and pays the hotel a
      // payout minus commission, so Deadline (the "channel") collects.
      PaymentCollect: "Channel",
      Customers: [
        {
          // TODO: Deadline doesn't collect guest country of residence;
          // defaulting to US until that's captured at bid/profile time.
          CustomerCountry: "US",
          CustomerEmail: bid.users.email || "",
          CustomerFName: firstName,
          CustomerLName: lastName,
          // Deadline never masks the guest's real email/phone behind a
          // temporary one — the hotel gets the real contact details.
          ...(bid.users.phone ? { CustomerPhone: bid.users.phone } : {}),
        },
      ],
      Rooms: [
        {
          ChannelRoomType: place.slug,
          Currency: "USD",
          Adults: 1,
          Babies: 0,
          Children: 0,
          Occupancy: 1,
          RateDesc: "Deadline Threshold Rate",
          RateId: "default",
          DayRates: dayRates,
          StartDate: format(checkIn, "yyyy-MM-dd"),
          EndDate: format(lastNight, "yyyy-MM-dd"),
          Price: Number(bid.totalAmount),
          Units: 1,
        },
      ],
    },
  });
});

// Cloudbeds calls this to tell us a booking was cancelled on their side; we
// acknowledge it. Sandbox is a pure no-op success.
// TODO before live hotels use this channel: look up the matching bid and run
// our real cancellation flow (status -> CANCELLED + refund; see cancelBid).
router.post("/CancelBooking", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const place = await findPlaceByOtaId(req.body?.ota_property_id);
  if (!place) {
    return fail(
      res,
      ERROR.LOGIN,
      "The login details you provided are incorrect.",
    );
  }
  const bookingId = req.body?.booking_id;
  if (typeof bookingId !== "string" || !bookingId) {
    return fail(res, ERROR.NO_SUCH_BOOKING, "No such booking id.");
  }
  return res.json({ success: true });
});

// Fire a test booking + cancellation to the myallocator test property (for
// Cloudbeds go-live: "send a test booking and then cancel it"). Pokes
// NotifyBooking so myallocator polls our GetBookingList/GetBookingId — where the
// sandbox now serves one active booking + one cancelled booking. Gated by
// shared_secret. Requires MYALLOCATOR_OTA_CID + MYALLOCATOR_SHARED_SECRET set.
router.post("/_send-test-booking", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const out: Record<string, string> = {};
  try {
    await notifyBookingConfirmed(SANDBOX_BOOKING_ID, SANDBOX_PROPERTY_ID);
    out.confirm = "sent";
  } catch (err) {
    out.confirm = `error: ${(err as Error)?.message ?? "failed"}`;
  }
  try {
    await notifyBookingCancelled(SANDBOX_CANCEL_BOOKING_ID, SANDBOX_PROPERTY_ID);
    out.cancel = "sent";
  } catch (err) {
    out.cancel = `error: ${(err as Error)?.message ?? "failed"}`;
  }
  return res.json({
    success: true,
    ota_cid: process.env.MYALLOCATOR_OTA_CID ?? "(MYALLOCATOR_OTA_CID not set)",
    ...out,
  });
});

// Self-cert debugging: read back the last captured sandbox payload for a verb.
// Gated by shared_secret. Temporary aid for certification; safe to remove after.
router.post("/_sandbox-last", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
  }
  const verb =
    typeof req.body?.verb === "string" ? req.body.verb : "ARIUpdate";
  const payload = sandboxRedis
    ? await sandboxRedis.get(`myalloc:sandbox:last:${verb}`)
    : null;
  return res.json({ success: true, verb, payload });
});
