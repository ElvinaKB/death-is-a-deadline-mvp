import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { parseBookingDateOnly } from "../libs/utils/hotelDates";
import {
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

  res.status(200).json({
    data: {
      available: true,
      nights: quote.nights,
      memberPricePerNight: quote.memberPricePerNight,
      memberTotal: quote.memberTotal,
      retailPricePerNight: quote.retailPricePerNight,
      // Collected by the hotel at check-in. Non-tax mandatory fees (resort /
      // service) must be included in the displayed total (FTC Junk Fees Rule,
      // CA SB 478); government taxes may be disclosed separately.
      payAtHotel: quote.payAtHotel,
      payAtHotelNonTax: quote.payAtHotelNonTax,
      displayTotal: quote.memberTotal + quote.payAtHotelNonTax,
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

/**
 * Run the wholesale import (all California markets, or ?cities=A,B). Runs in
 * the background; results go to the server log.
 */
export async function runImport(req: Request, res: Response) {
  const cities =
    typeof req.query.cities === "string" && req.query.cities.trim()
      ? req.query.cities.split(",").map((c) => c.trim()).filter(Boolean)
      : WHOLESALE_CONFIG.MARKETS;

  res.status(202).json({ message: "Import started", data: { cities } });

  importWholesaleMarkets(cities)
    .then((results) =>
      console.log("[wholesale] import finished:", JSON.stringify(results)),
    )
    .catch((err) => console.error("[wholesale] import failed:", err));
}
