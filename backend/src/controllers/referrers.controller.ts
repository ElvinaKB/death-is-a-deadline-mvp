import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../libs/config/prisma";
import { bid_status } from "@prisma/client";
import { supabase } from "../libs/config/supabase";
import { CustomError } from "../libs/utils/CustomError";
import { ApprovalStatus, UserRole } from "../types/auth.types";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

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
  const { email, displayName, splitPercent, demoPassword } = req.body as {
    email?: string;
    displayName?: string;
    splitPercent?: number;
    demoPassword?: string;
  };
  if (!email || !displayName) {
    return res
      .status(400)
      .json({ message: "email and displayName are required" });
  }
  const lower = email.toLowerCase();

  // A referrer is also a traveler account. Reuse it if one already exists;
  // otherwise create the account exactly like "Add Traveler" — pre-approved +
  // email-confirmed, so the person becomes both a verified traveler AND an
  // affiliate. Real affiliates get a "set your password" email; a demoPassword
  // (for accounts you can't email-verify, like a demo login) sets a known
  // password and skips the email.
  let userId: string | null = null;
  const existingUser = await prisma.users.findFirst({
    where: { email: lower },
    select: { id: true },
  });

  if (existingUser) {
    userId = existingUser.id;
    const existingRef = await prisma.referrer.findUnique({
      where: { userId },
    });
    if (existingRef) {
      return res
        .status(409)
        .json({ message: "That account is already a referrer." });
    }
  } else {
    const usingDemoPassword = Boolean(demoPassword && demoPassword.length >= 6);
    const password = usingDemoPassword
      ? (demoPassword as string)
      : crypto.randomBytes(24).toString("hex");

    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email: lower,
        password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          approvalStatus: ApprovalStatus.APPROVED,
          verifiedVia: "admin",
          isAffiliate: true,
        },
        role: UserRole.STUDENT,
      });
    if (createError) throw new CustomError(createError.message, 400);
    userId = createData?.user?.id ?? null;
    if (!userId) throw new CustomError("Failed to create account", 500);

    // Real affiliate (no demo password): email them a set-password link.
    if (!usingDemoPassword) {
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email: lower,
          options: { redirectTo: `${process.env.CLIENT_URL}/reset-password` },
        });
        const passwordSetupUrl = linkData?.properties?.action_link;
        if (passwordSetupUrl) {
          await sendEmail({
            type: EmailType.STUDENT_WELCOME,
            to: lower,
            subject: "You're a Deadline affiliate — set your password",
            variables: {
              name: displayName,
              appName: "Deadline",
              passwordSetupUrl,
            },
          });
        }
      } catch (err) {
        console.error("[referrers] welcome email failed", err);
      }
    }
  }

  const referrer = await prisma.referrer.create({
    data: {
      userId,
      email: lower,
      displayName,
      ...(typeof splitPercent === "number" ? { splitPercent } : {}),
    },
  });
  res.status(201).json({ data: referrer });
}

// Set/reset a referrer's login password (admin only). For demo accounts you
// can't email-verify, or to recover an account created without a demo password.
export async function setReferrerPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }
  const referrer = await prisma.referrer.findUnique({ where: { id } });
  if (!referrer) return res.status(404).json({ message: "Referrer not found" });
  const { error } = await supabase.auth.admin.updateUserById(referrer.userId, {
    password,
    email_confirm: true,
  });
  if (error) throw new CustomError(error.message, 400);
  res.json({ data: { ok: true } });
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
