import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { bid_status } from "@prisma/client";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// A referrer earns splitPercent of each accepted booking on their referred
// hotels, for bookings made within each hotel's referral window
// (referralStartedAt + referralWindowMonths).
async function computeReferrerEarnings(referrer: {
  id: string;
  splitPercent: number;
  referralWindowMonths: number;
}) {
  const places = await prisma.place.findMany({
    where: { referrerId: referrer.id },
    select: {
      id: true,
      name: true,
      city: true,
      referralStartedAt: true,
      bids: {
        where: { status: bid_status.ACCEPTED },
        select: { totalAmount: true, createdAt: true },
      },
    },
  });

  let totalEarnings = 0;
  let bookingCount = 0;
  const hotels = places.map((p) => {
    const start = p.referralStartedAt ?? null;
    const windowEnd = start
      ? addMonths(start, referrer.referralWindowMonths)
      : null;
    const inWindow = p.bids.filter((b) => {
      if (!start) return true;
      const t = b.createdAt.getTime();
      return t >= start.getTime() && (!windowEnd || t <= windowEnd.getTime());
    });
    const gross = inWindow.reduce((s, b) => s + Number(b.totalAmount), 0);
    const earning = (gross * referrer.splitPercent) / 100;
    totalEarnings += earning;
    bookingCount += inWindow.length;
    return {
      placeId: p.id,
      name: p.name,
      city: p.city,
      referralStartedAt: start,
      windowEndsAt: windowEnd,
      bookings: inWindow.length,
      gross: Number(gross.toFixed(2)),
      earning: Number(earning.toFixed(2)),
    };
  });

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    bookingCount,
    hotels,
  };
}

// ── Admin ──────────────────────────────────────────────────────────────────
export async function listReferrers(_req: Request, res: Response) {
  const referrers = await prisma.referrer.findMany({
    orderBy: { createdAt: "desc" },
  });
  const data = await Promise.all(
    referrers.map(async (r) => {
      const earnings = await computeReferrerEarnings(r);
      return {
        id: r.id,
        displayName: r.displayName,
        email: r.email,
        splitPercent: r.splitPercent,
        referralWindowMonths: r.referralWindowMonths,
        taxStatus: r.taxStatus,
        status: r.status,
        totalEarnings: earnings.totalEarnings,
        bookingCount: earnings.bookingCount,
        hotelCount: earnings.hotels.length,
        hotels: earnings.hotels,
      };
    }),
  );
  res.json({ data: { referrers: data, total: data.length } });
}

export async function createReferrer(req: Request, res: Response) {
  const { email, displayName, splitPercent } = req.body as {
    email?: string;
    displayName?: string;
    splitPercent?: number;
  };
  if (!email || !displayName) {
    return res
      .status(400)
      .json({ message: "email and displayName are required" });
  }
  // A referrer is also a traveler account — they must sign up first.
  const user = await prisma.users.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) {
    return res.status(404).json({
      message:
        "No account found for that email. The referrer must sign up as a traveler first.",
    });
  }
  const existing = await prisma.referrer.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return res.status(409).json({ message: "That user is already a referrer." });
  }
  const referrer = await prisma.referrer.create({
    data: {
      userId: user.id,
      email: email.toLowerCase(),
      displayName,
      ...(typeof splitPercent === "number" ? { splitPercent } : {}),
    },
  });
  res.status(201).json({ data: referrer });
}

// Attach (or detach) a referrer to a hotel listing. Setting a referrer starts
// the 1-year window now unless a date is provided; clearing it removes both.
export async function assignPlaceReferrer(req: Request, res: Response) {
  const { id } = req.params;
  const { referrerId, referralStartedAt } = req.body as {
    referrerId?: string | null;
    referralStartedAt?: string | null;
  };
  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) return res.status(404).json({ message: "Place not found" });

  const updated = await prisma.place.update({
    where: { id },
    data: {
      referrerId: referrerId ?? null,
      referralStartedAt: referrerId
        ? referralStartedAt
          ? new Date(referralStartedAt)
          : place.referralStartedAt ?? new Date()
        : null,
    },
  });
  res.json({
    data: {
      id: updated.id,
      referrerId: updated.referrerId,
      referralStartedAt: updated.referralStartedAt,
    },
  });
}

// ── Affiliate self-service (their own portal) ───────────────────────────────
export async function getMyReferrer(req: Request, res: Response) {
  const userId = req.user!.id;
  const referrer = await prisma.referrer.findUnique({ where: { userId } });
  if (!referrer) return res.json({ data: null });
  const earnings = await computeReferrerEarnings(referrer);
  res.json({
    data: {
      displayName: referrer.displayName,
      email: referrer.email,
      splitPercent: referrer.splitPercent,
      referralWindowMonths: referrer.referralWindowMonths,
      taxStatus: referrer.taxStatus,
      taxLegalName: referrer.taxLegalName,
      taxClassification: referrer.taxClassification,
      taxAddress: referrer.taxAddress,
      totalEarnings: earnings.totalEarnings,
      bookingCount: earnings.bookingCount,
      hotels: earnings.hotels,
    },
  });
}

export async function submitMyTaxDetails(req: Request, res: Response) {
  const userId = req.user!.id;
  const { taxLegalName, taxClassification, taxAddress } = req.body as {
    taxLegalName?: string;
    taxClassification?: string;
    taxAddress?: string;
  };
  if (!taxLegalName || !taxClassification) {
    return res
      .status(400)
      .json({ message: "Legal name and tax classification are required" });
  }
  const referrer = await prisma.referrer.findUnique({ where: { userId } });
  if (!referrer) return res.status(404).json({ message: "You are not a referrer" });
  const updated = await prisma.referrer.update({
    where: { userId },
    data: {
      taxLegalName,
      taxClassification,
      taxAddress: taxAddress ?? null,
      taxStatus: "submitted",
    },
  });
  res.json({ data: { taxStatus: updated.taxStatus } });
}
