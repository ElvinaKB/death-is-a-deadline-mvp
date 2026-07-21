import { Router, Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { bid_status } from "@prisma/client";
import { addDays, differenceInCalendarDays, format } from "date-fns";

// Cloudbeds OTA Build-To-Us API (myallocator).
// Spec: https://developers.cloudbeds.com/reference/ota-build-to-us-introduction
//
// Every call is a POST with a JSON body (never a 4xx/5xx for business
// errors — failures are conveyed via `success:false` + `errors` in a 200).
// Error codes: https://apidocs.myallocator.com/ota-errors.html

export const router = Router();

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

// Deadline models one bookable unit type per Place (no separate room-type
// table), so `ota_room_id` / `ota_property_id` map 1:1 to `Place.slug`.
async function findPlaceByOtaId(otaPropertyId: unknown) {
  if (typeof otaPropertyId !== "string" || !otaPropertyId) return null;
  return prisma.place.findUnique({ where: { slug: otaPropertyId } });
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

// Cloudbeds pushes ARI (availability/rates/restrictions) to us here.
// Deadline doesn't yet have a per-day channel-inventory table to apply
// these updates to, so for now we just acknowledge receipt (the request
// is still captured by the global audit-log middleware for visibility).
// TODO: once a per-day rate/availability model exists, use this to drive
// what's shown as biddable inventory.
router.post("/ARIUpdate", async (req: Request, res: Response) => {
  if (!hasValidSharedSecret(req.body)) {
    return fail(res, ERROR.LOGIN, "Invalid shared_secret.");
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

  const bid = await prisma.bid.findFirst({
    where: {
      id: bookingId,
      placeId: place.id,
      status: { in: [bid_status.ACCEPTED, bid_status.CANCELLED] },
    },
    include: { users: { select: { email: true, raw_user_meta_data: true } } },
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
