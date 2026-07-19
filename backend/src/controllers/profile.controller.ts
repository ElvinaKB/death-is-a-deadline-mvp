import { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../libs/config/supabase";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { bid_status } from "@prisma/client";

interface TravelPreferences {
  destinations: string[];
  tripTypes: string[];
  hotelStyle: string[];
  budget: string | null;
}

const EMPTY_PREFERENCES: TravelPreferences = {
  destinations: [],
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

function earlyAccessStatus(successfulStays: number): string {
  if (successfulStays >= 5) return "Insider";
  if (successfulStays >= 1) return "Member";
  return "Explorer";
}

export async function getProfile(req: Request, res: Response) {
  const userId = req.user!.id;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) throw new CustomError("User not found", 404);

  const meta = (data.user.user_metadata ?? {}) as Record<string, any>;
  const referralCode: string | null = meta.referralCode ?? null;

  const [successfulStays, wonPlaces, friendsReferred] = await Promise.all([
    prisma.bid.count({
      where: { studentId: userId, status: bid_status.ACCEPTED },
    }),
    prisma.bid.findMany({
      where: { studentId: userId, status: bid_status.ACCEPTED },
      select: { placeId: true, place: { select: { city: true } } },
      distinct: ["placeId"],
    }),
    referralCode
      ? prisma.users.count({
          where: { raw_user_meta_data: { path: ["referredBy"], equals: referralCode } },
        })
      : Promise.resolve(0),
  ]);

  const citiesVisited = new Set(
    wonPlaces.map((b) => b.place?.city).filter(Boolean),
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
        referralCode,
        referralCredit: meta.referralCredit ?? 0,
        travelPreferences: (meta.travelPreferences as TravelPreferences) ?? EMPTY_PREFERENCES,
        interests: (meta.interests as string[]) ?? [],
        wishlistDestinations: (meta.wishlistDestinations as string[]) ?? [],
        memberSince: data.user.created_at,
        successfulStays,
        hotelsUnlocked: wonPlaces.length,
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
