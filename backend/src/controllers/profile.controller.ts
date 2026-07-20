import { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../libs/config/supabase";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { bid_status, payment_status } from "@prisma/client";

interface TravelPreferences {
  tripTypes: string[];
  hotelStyle: string[];
  budget: string | null;
}

const EMPTY_PREFERENCES: TravelPreferences = {
  tripTypes: [],
  hotelStyle: [],
  budget: null,
};

function generateReferralCode(name?: string | null): string {
  const base =
    (name || "TRAVELER")
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "TRAVELER";
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base}${suffix}`;
}

const TIERS = [
  { name: "Explorer", min: 0, description: "Just getting started — book your first stay to level up." },
  { name: "Insider", min: 1, description: "You've completed at least one stay." },
  { name: "Icon", min: 5, description: "5+ completed stays — our most active travelers." },
] as const;

function earlyAccessStatus(successfulStays: number): { name: string; description: string } {
  const tier = [...TIERS].reverse().find((t) => successfulStays >= t.min)!;
  return { name: tier.name, description: tier.description };
}

export async function getProfile(req: Request, res: Response) {
  const userId = req.user!.id;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) throw new CustomError("User not found", 404);

  const meta = (data.user.user_metadata ?? {}) as Record<string, any>;
  const referralCode: string | null = meta.referralCode ?? null;

  const [successfulStays, unlockedPlaces, paidStays, friendsReferred] = await Promise.all([
    // A "successful stay" is a booking that actually happened — accepted
    // and paid — not just an accepted bid still awaiting payment.
    prisma.bid.count({
      where: {
        studentId: userId,
        status: bid_status.ACCEPTED,
        payment: { status: payment_status.CAPTURED },
      },
    }),
    // "Hotels unlocked" is broader: every distinct property where a bid
    // was ever accepted, whether or not the stay was completed/paid.
    prisma.bid.findMany({
      where: { studentId: userId, status: bid_status.ACCEPTED },
      select: { placeId: true },
      distinct: ["placeId"],
    }),
    prisma.bid.findMany({
      where: {
        studentId: userId,
        status: bid_status.ACCEPTED,
        payment: { status: payment_status.CAPTURED },
      },
      select: { place: { select: { city: true } } },
    }),
    referralCode
      ? prisma.users.count({
          where: { raw_user_meta_data: { path: ["referredBy"], equals: referralCode } },
        })
      : Promise.resolve(0),
  ]);

  const citiesVisited = new Set(
    paidStays.map((b) => b.place?.city).filter(Boolean),
  ).size;

  res.status(200).json({
    data: {
      profile: {
        name: meta.name ?? "",
        email: data.user.email,
        phone: meta.phone ?? "",
        occupation: meta.occupation ?? "",
        linkedinProfileUrl: meta.linkedinProfileUrl ?? "",
        instagramHandle: meta.instagramHandle ?? "",
        avatarUrl: meta.avatarUrl ?? null,
        referralCode,
        referralCredit: meta.referralCredit ?? 0,
        travelPreferences: (meta.travelPreferences as TravelPreferences) ?? EMPTY_PREFERENCES,
        interests: (meta.interests as string[]) ?? [],
        wishlistDestinations: (meta.wishlistDestinations as string[]) ?? [],
        memberSince: data.user.created_at,
        successfulStays,
        hotelsUnlocked: unlockedPlaces.length,
        citiesVisited,
        friendsReferred,
        earlyAccessStatus: earlyAccessStatus(successfulStays),
      },
    },
  });
}

export async function updateProfile(req: Request, res: Response) {
  const userId = req.user!.id;
  const {
    name,
    phone,
    occupation,
    linkedinProfileUrl,
    instagramHandle,
    travelPreferences,
    interests,
    wishlistDestinations,
  } = req.body;

  const { data: existing, error: fetchError } =
    await supabase.auth.admin.getUserById(userId);
  if (fetchError || !existing.user) throw new CustomError("User not found", 404);
  const meta = (existing.user.user_metadata ?? {}) as Record<string, any>;

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(occupation !== undefined && { occupation }),
      ...(linkedinProfileUrl !== undefined && { linkedinProfileUrl }),
      ...(instagramHandle !== undefined && { instagramHandle }),
      ...(travelPreferences !== undefined && { travelPreferences }),
      ...(interests !== undefined && { interests }),
      ...(wishlistDestinations !== undefined && { wishlistDestinations }),
    },
  });
  if (error) throw new CustomError(error.message, 400);

  res.status(200).json({ message: "Profile updated" });
}

/** Saves the public URL of a photo the traveler already uploaded to Supabase Storage. */
export async function updateAvatar(req: Request, res: Response) {
  const userId = req.user!.id;
  const { avatarUrl } = req.body;
  if (!avatarUrl || typeof avatarUrl !== "string") {
    throw new CustomError("avatarUrl is required", 400);
  }

  const { data: existing, error: fetchError } =
    await supabase.auth.admin.getUserById(userId);
  if (fetchError || !existing.user) throw new CustomError("User not found", 404);
  const meta = (existing.user.user_metadata ?? {}) as Record<string, any>;

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, avatarUrl },
  });
  if (error) throw new CustomError(error.message, 400);

  res.status(200).json({ data: { avatarUrl } });
}

/** Returns the existing referral code, generating one on first request. */
export async function getOrCreateReferralCode(req: Request, res: Response) {
  const userId = req.user!.id;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) throw new CustomError("User not found", 404);
  const meta = (data.user.user_metadata ?? {}) as Record<string, any>;

  if (meta.referralCode) {
    return res.status(200).json({ data: { referralCode: meta.referralCode } });
  }

  const code = generateReferralCode(meta.name);
  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, referralCode: code },
  });
  if (updateError) throw new CustomError(updateError.message, 400);

  res.status(200).json({ data: { referralCode: code } });
}

/** Admin-only: tally of every traveler's free-text "where to next" wishlist entries. */
export async function getWishlistTally(_req: Request, res: Response) {
  const users = await prisma.users.findMany({
    where: { role: "STUDENT" },
    select: { raw_user_meta_data: true },
  });

  const tally = new Map<string, { destination: string; count: number }>();
  for (const u of users) {
    const meta = (u.raw_user_meta_data ?? {}) as Record<string, any>;
    const wishlist = Array.isArray(meta.wishlistDestinations)
      ? (meta.wishlistDestinations as unknown[])
      : [];
    for (const raw of wishlist) {
      const destination = String(raw).trim();
      if (!destination) continue;
      const key = destination.toLowerCase();
      const existing = tally.get(key);
      if (existing) existing.count += 1;
      else tally.set(key, { destination, count: 1 });
    }
  }

  const destinations = Array.from(tally.values()).sort((a, b) => b.count - a.count);

  res.status(200).json({ data: { destinations } });
}
