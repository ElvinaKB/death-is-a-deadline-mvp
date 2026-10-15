import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { parseBookingDateOnly } from "../libs/utils/hotelDates";
import { LiteapiError } from "../services/liteapi.service";
import {
  completeWholesaleCheckout,
  startWholesaleCheckout,
  getWholesaleQuote,
  importWholesaleMarkets,
  isWholesale,
  WHOLESALE_CONFIG,
} from "../services/wholesale.service";

/**
 * Members-only live price for a wholesale hotel ("Book now $X"). Below-public
 * prices are only ever shown to logged-in members (closed user group), so this
 * route sits behind authentication and is never edge-cached.
 */
export async function getQuote(req: Request, res: Response) {
  res.set("Cache-Control", "private, no-store");
  const { id } = req.params;
  const { checkInDate, checkOutDate } = req.query as Record<string, string>;

  if (!WHOLESALE_CONFIG.ENABLED) throw new CustomError("Not available", 404);

  const place = await prisma.place.findUnique({ where: { id } });
  if (!place || !isWholesale(place)) throw new CustomError("Place not found", 404);

  let checkIn: Date;
  let checkOut: Date;
  try {
    checkIn = parseBookingDateOnly(checkInDate!);
    checkOut = parseBookingDateOnly(checkOutDate!);
  } catch {
    throw new CustomError("Invalid booking date", 400);
  }
  if (checkOut <= checkIn) throw new CustomError("Check-out must be after check-in", 400);

  const quote = await getWholesaleQuote(place, checkIn, checkOut);
  if (!quote) {
    return res.status(200).json({ data: { available: false } });
  }

  // The member price (the bid floor) is deliberately NOT returned: it's the
  // secret a bid has to reach. Only the public "Book now" price goes out.
  const nonTax = quote.payAtHotelNonTax;
  res.status(200).json({
    data: {
      available: true,
      nights: quote.nights,
      bookNowPricePerNight: quote.bookNowPricePerNight,
      bookNowTotal: quote.bookNowPricePerNight * quote.nights,
      // Collected by the hotel at check-in. Non-tax mandatory fees (resort /
      // service) must be included in the displayed total (FTC Junk Fees Rule,
      // CA SB 478); government taxes may be disclosed separately.
      payAtHotel: quote.payAtHotel,
      payAtHotelNonTax: nonTax,
      bookNowDisplayTotal: quote.bookNowPricePerNight * quote.nights + nonTax,
      refundable: quote.refundable,
      roomName: quote.offer.roomName,
      boardName: quote.offer.boardName,
    },
  });
}

/** Nightly scheduler auth: the x-cron-secret header must match WHOLESALE_CRON_SECRET. */
export function requireCronSecret(req: Request, _res: Response, next: () => void) {
  const expected = process.env.WHOLESALE_CRON_SECRET;
  const given = req.header("x-cron-secret");
  if (
    !expected ||
    !given ||
    expected.length !== given.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  ) {
    throw new CustomError("Unauthorized", 401);
  }
  next();
}

/** The California go-to-market city list (drives the nightly job + admin button). */
export async function listMarkets(_req: Request, res: Response) {
  res.status(200).json({ data: { markets: WHOLESALE_CONFIG.MARKETS } });
}

/**
 * Import / refresh one city per request (?city=Los Angeles). The backend runs
 * as Vercel serverless functions, which stop when the response is sent, so the
 * work happens inside the request and callers step through the cities.
 */
export async function runImport(req: Request, res: Response) {
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  if (!city) throw new CustomError("city is required", 400);
  const [summary] = await importWholesaleMarkets([city]);
  console.log("[wholesale] import:", JSON.stringify(summary));
  res.status(200).json({ data: summary });
}

/** Winning wholesale bid → Nuitee payment session (Nuitee charges the member). */
export async function startCheckout(req: Request, res: Response) {
  try {
    const session = await startWholesaleCheckout(req.params.bidId!, req.user!.id);
    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ data: session });
  } catch (err) {
    const e = err as LiteapiError;
    throw new CustomError(
      e.noAvailability
        ? "Sorry — this room just sold out or changed price. You haven't been charged. Please bid again or try another hotel."
        : e.message || "Couldn't start checkout",
      e.noAvailability ? 409 : 400,
    );
  }
}

/** After Nuitee's payment form: confirm the booking with Nuitee. */
export async function completeCheckout(req: Request, res: Response) {
  const result = await completeWholesaleCheckout(req.params.bidId!, req.user!.id);
  res.set("Cache-Control", "private, no-store");
  if (!result.ok) {
    throw new CustomError(
      "Your payment went through but we couldn't confirm the room with the hotel yet. Our team has been alerted and will email you shortly — you won't be charged for a room you don't get.",
      502,
      { reason: result.reason },
    );
  }
  res.status(200).json({ data: { confirmationCode: result.confirmationCode } });
}
