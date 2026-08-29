import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { PlaceStatus, Prisma, bid_status } from "@prisma/client";
import {
  CreatePlaceInput,
  UpdatePlaceInput,
  UpdatePlaceStatusInput,
  ListPlacesQuery,
  PublicPlacesQuery,
} from "../validations/places/places.validation";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import {
  createHotelInviteToken,
  HOTEL_INVITE_EXPIRY_DAYS,
} from "../libs/utils/inviteToken";
import { supabase } from "../libs/config/supabase";
import {
  inferTimezoneFromLocation,
  parseBookingDateOnly,
} from "../libs/utils/hotelDates";
import {
  getEffectiveCapByDate,
  getSoldOutNightsInRange,
} from "../services/inventory.service";
import {
  resolvePlaceThresholdPayload,
  validatePlaceThresholdPricing,
} from "../services/thresholdPricing.service";
import {
  generateUniquePlaceSlug,
  isUuid,
} from "../libs/utils/placeSlug";

const APP_URL = process.env.CLIENT_URL;

// Helper to format place response
const formatPlace = (
  place: any,
  inventoryInfo?: {
    availableInventory?: number;
    isInventoryExhausted?: boolean;
  },
) => ({
  id: place.id,
  slug: place.slug,
  name: place.name,
  email: place.email,
  reservationPhone: place.reservationPhone,
  shortDescription: place.shortDescription,
  fullDescription: place.fullDescription,
  keywords: place.keywords || [],
  city: place.city,
  country: place.country,
  address: place.address,
  images: place.images || [],
  accommodationType: place.accommodationType,
  retailPrice: place.retailPrice,
  minimumBid: place.minimumBid,
  thresholdPricingMode: place.thresholdPricingMode ?? "UNIFORM",
  minimumBidByDayOfWeek: (place.minimumBidByDayOfWeek || []).map(Number),
  autoAcceptAboveMinimum: place.autoAcceptAboveMinimum,
  blackoutDates: place.blackoutDates || [],
  allowedDaysOfWeek: place.allowedDaysOfWeek || [0, 1, 2, 3, 4, 5, 6],
  maxInventory: place.maxInventory || 1,
  mandatoryResortFeeAmount: place.mandatoryResortFeeAmount || 0,
  mandatoryParkingFeeAmount: place.mandatoryParkingFeeAmount || 0,
  verticalVideoUrl: place.verticalVideoUrl || null,
  neighborhoodGuideText: place.neighborhoodGuideText || null,
  neighborhoodGuideImageUrl: place.neighborhoodGuideImageUrl || null,
  status: place.status,
  createdAt: place.createdAt,
  updatedAt: place.updatedAt,
  latitude: place.latitude,
  longitude: place.longitude,
  timezone: place.timezone ?? inferTimezoneFromLocation(place.city, place.country),
  // Include inventory info if provided
  ...(inventoryInfo && {
    availableInventory: inventoryInfo.availableInventory,
    isInventoryExhausted: inventoryInfo.isInventoryExhausted,
  }),
});

const placeInclude = { images: { orderBy: { order: "asc" as const } } };

async function findPlaceByRef(ref: string) {
  if (isUuid(ref)) {
    return prisma.place.findUnique({
      where: { id: ref },
      include: placeInclude,
    });
  }

  return prisma.place.findUnique({
    where: { slug: ref },
    include: placeInclude,
  });
}

/** yyyy-MM-dd from query string or ISO datetime */
function normalizeQueryDate(date: string): string {
  return date.includes("T") ? date.split("T")[0]! : date;
}

function startOfUtcDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function endOfUtcDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}

// Helper to count accepted bids for a place on a specific calendar night
/** Student marketplace — retail anchor only; hidden minimum stays server-side */
const formatPublicPlace = (
  place: Parameters<typeof formatPlace>[0],
  inventoryInfo?: Parameters<typeof formatPlace>[1],
) => {
  const { minimumBid: _minimumBid, autoAcceptAboveMinimum: _auto, thresholdPricingMode: _tpm, minimumBidByDayOfWeek: _mbd, ...rest } =
    formatPlace(place, inventoryInfo);
  return rest;
};

// Helper to count accepted bids for a place on a specific date
// A bid is considered to occupy a date if the date falls within [checkInDate, checkOutDate)
async function getAcceptedBidsCountForDate(
  placeId: string,
  date: string,
): Promise<number> {
  const dateOnly = normalizeQueryDate(date);
  const dayStart = startOfUtcDay(dateOnly);
  const dayEnd = endOfUtcDay(dateOnly);

  const count = await prisma.bid.count({
    where: {
      placeId,
      status: bid_status.ACCEPTED,
      checkInDate: { lte: dayEnd },
      checkOutDate: { gt: dayStart },
    },
  });

  return count;
}

// Helper to check inventory availability for a place on a specific date
async function getInventoryStatus(
  place: { id: string; maxInventory: number },
  date: string,
): Promise<{ availableInventory: number; isInventoryExhausted: boolean }> {
  const dateOnly = normalizeQueryDate(date);
  const [acceptedBidsCount, effectiveCaps] = await Promise.all([
    getAcceptedBidsCountForDate(place.id, dateOnly),
    getEffectiveCapByDate(place.id, place.maxInventory, dateOnly, dateOnly),
  ]);
  // Cloudbeds `units` can only lower the cap; absent a pushed value we fall
  // back to the hotel's own maxInventory.
  const cap = effectiveCaps.get(dateOnly) ?? place.maxInventory;
  const availableInventory = Math.max(0, cap - acceptedBidsCount);

  return {
    availableInventory,
    isInventoryExhausted: availableInventory === 0,
  };
}

/**
 * Batched version of getInventoryStatus for a page of places at once — 2
 * queries total instead of 2 per place. A per-place round trip here (one
 * getAcceptedBidsCountForDate + one getEffectiveCapByDate call for every
 * listing on the page) was the main contributor to the homepage's listings
 * taking ~3s to load, since the public marketplace always passes a date.
 */
async function getInventoryStatusesForDate(
  places: { id: string; maxInventory: number }[],
  date: string,
): Promise<
  Map<string, { availableInventory: number; isInventoryExhausted: boolean }>
> {
  const dateOnly = normalizeQueryDate(date);
  const dayStart = startOfUtcDay(dateOnly);
  const dayEnd = endOfUtcDay(dateOnly);
  const placeIds = places.map((p) => p.id);

  const [bidCounts, channelRows] = await Promise.all([
    prisma.bid.groupBy({
      by: ["placeId"],
      where: {
        placeId: { in: placeIds },
        status: bid_status.ACCEPTED,
        checkInDate: { lte: dayEnd },
        checkOutDate: { gt: dayStart },
      },
      _count: { _all: true },
    }),
    prisma.placeChannelAvailability
      .findMany({
        where: { placeId: { in: placeIds }, date: parseBookingDateOnly(dateOnly) },
        select: { placeId: true, units: true },
      })
      // Same fallback as getEffectiveCapByDate: if the table/migration isn't
      // there yet, behave as if no channel data exists.
      .catch(() => [] as { placeId: string; units: number }[]),
  ]);

  const acceptedCountByPlace = new Map(
    bidCounts.map((row) => [row.placeId, row._count._all]),
  );
  const capByPlace = new Map(channelRows.map((row) => [row.placeId, row.units]));

  const result = new Map<
    string,
    { availableInventory: number; isInventoryExhausted: boolean }
  >();
  for (const place of places) {
    const acceptedCount = acceptedCountByPlace.get(place.id) ?? 0;
    const channelUnits = capByPlace.get(place.id);
    const cap =
      channelUnits !== undefined
        ? Math.min(place.maxInventory, channelUnits)
        : place.maxInventory;
    const availableInventory = Math.max(0, cap - acceptedCount);
    result.set(place.id, {
      availableInventory,
      isInventoryExhausted: availableInventory === 0,
    });
  }
  return result;
}

// List all places (admin - optionally filter by status, with pagination)
export async function listPlaces(req: Request, res: Response) {
  const {
    status,
    page = 1,
    limit = 10,
  } = req.query as unknown as ListPlacesQuery;
  const skip = (page - 1) * limit;

  const where: Prisma.PlaceWhereInput = status ? { status } : {};

  const [places, total] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.place.count({ where }),
  ]);

  // Collect all emails from this page of results
  const emails = places.map((p) => p.email).filter(Boolean);

  // One query to find which emails already have a user account
  const existingUsers = await supabase.rpc("get_users_by_emails", { emails });
  if (existingUsers.error)
    throw new CustomError("Failed to fetch user accounts", 500);
  // or: prisma query against your users table if you mirror them there
  const accountEmails = new Set(existingUsers.data.map((u: any) => u.email));

  // Attach the flag to each place
  const data = places.map((place) => ({
    ...formatPlace(place),
    hasHotelAccount: place.email ? accountEmails.has(place.email) : false,
  }));

  res.status(200).json({
    data: {
      places: data,
      total,
      page,
      limit,
    },
  });
}

// List places owned by the authenticated hotel user
// Ownership is determined by matching place.email to req.user.email
export async function listHotelPlaces(req: Request, res: Response) {
  const {
    status,
    page = 1,
    limit = 10,
  } = req.query as unknown as ListPlacesQuery;

  const hotelEmail = req.user?.email;

  console.log("Hotel email from token:", req.user);

  if (!hotelEmail) {
    throw new CustomError("Could not determine hotel identity", 400);
  }

  const skip = (page - 1) * limit;

  const where: Prisma.PlaceWhereInput = {
    // Case-insensitive: the account email (Supabase-lowercased) may differ in
    // case from the admin-entered place.email.
    email: { equals: hotelEmail, mode: "insensitive" },
    ...(status ? { status } : {}),
  };

  const [places, total] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.place.count({ where }),
  ]);

  const data = places.map((place) => formatPlace(place));

  res.status(200).json({
    data: {
      places: data,
      total,
      page,
      limit,
    },
  });
}

// List public places (for students marketplace - with filters)
export async function listPublicPlaces(req: Request, res: Response) {
  // Cache the public marketplace at Vercel's edge: serve instantly for 60s and
  // revalidate in the background for up to 5 min. Cuts the ~1s cold function
  // hit on the homepage's initial load for most visitors.
  res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  const {
    searchQuery,
    selectedType,
    city,
    priceRange,
    sortBy = "price-asc",
    page = 1,
    limit = 12,
    date,
  } = req.query as unknown as PublicPlacesQuery;

  const skip = (page - 1) * limit;

  // Build where clause - only LIVE places
  const where: Prisma.PlaceWhereInput = {
    status: PlaceStatus.LIVE,
  };

  // City filter (exact match, case-insensitive)
  if (city && city.trim()) {
    where.city = { equals: city, mode: "insensitive" };
  }

  // Search filter (name or city)
  if (searchQuery && searchQuery.trim()) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
      { country: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  // Accommodation type filter
  if (selectedType && selectedType !== "all") {
    where.accommodationType = selectedType;
  }

  // Price range filter
  if (priceRange && priceRange.length === 2) {
    where.retailPrice = {
      gte: priceRange[0],
      lte: priceRange[1],
    };
  }

  // blackoutDates filtering will be done after fetching

  // Build orderBy
  const orderBy: Prisma.PlaceOrderByWithRelationInput =
    sortBy === "price-desc" ? { retailPrice: "desc" } : { retailPrice: "asc" };

  let [places, total] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.place.count({ where }),
  ]);

  // Filter out places with blackoutDates containing the requested date (yyyy-MM-dd strings)
  if (date) {
    const dateOnly = normalizeQueryDate(date);
    places = places.filter((place) => {
      if (!Array.isArray(place.blackoutDates)) return true;
      return !place.blackoutDates.some((blackout) => {
        const blackoutDay = normalizeQueryDate(String(blackout));
        return blackoutDay === dateOnly;
      });
    });
  }

  // If date is provided, filter out places with exhausted inventory
  if (date) {
    const dateOnly = normalizeQueryDate(date);
    const inventoryByPlace = await getInventoryStatusesForDate(places, dateOnly);

    // Filter out places with exhausted inventory
    places = places.filter(
      (place) => !inventoryByPlace.get(place.id)?.isInventoryExhausted,
    );
  }

  total = places.length;

  res.status(200).json({
    data: {
      places: places.map((p) => formatPublicPlace(p)),
      total,
      page,
      limit,
    },
  });
}

// Get place by ID
export async function getPlace(req: Request, res: Response) {
  const { id } = req.params;

  const place = await prisma.place.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!place) {
    throw new CustomError("Place not found", 404);
  }

  res.status(200).json({
    data: { place: formatPlace(place) },
  });
}

// Get public place by ID (for students - includes inventory status)
export async function getPublicPlace(req: Request, res: Response) {
  res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  const { id: ref } = req.params;
  const { date } = req.query as { date?: string };

  const place = await findPlaceByRef(ref);

  if (!place) {
    throw new CustomError("Place not found", 404);
  }

  // For public access, only show LIVE places
  if (place.status !== PlaceStatus.LIVE) {
    throw new CustomError("Place not found", 404);
  }

  // If a date is provided, include inventory status
  let inventoryInfo:
    | { availableInventory: number; isInventoryExhausted: boolean }
    | undefined;

  if (date) {
    inventoryInfo = await getInventoryStatus(place, normalizeQueryDate(date));
  }

  res.status(200).json({
    data: {
      place: formatPublicPlace(place, inventoryInfo),
      // Include a clear message if inventory is exhausted
      ...(inventoryInfo?.isInventoryExhausted && {
        inventoryMessage:
          "Inventory sold out for this day, try a different date or place",
      }),
    },
  });
}

/** Sold-out calendar nights for bid date picker (public, LIVE places only). */
export async function getPublicPlaceUnavailableNights(
  req: Request,
  res: Response,
) {
  const { id: ref } = req.params;
  const { from, to } = req.query as { from: string; to: string };

  const place = await findPlaceByRef(ref);

  if (!place || place.status !== PlaceStatus.LIVE) {
    throw new CustomError("Place not found", 404);
  }

  const soldOutNights = await getSoldOutNightsInRange(
    place.id,
    place.maxInventory,
    from,
    to,
  );

  res.status(200).json({
    data: { soldOutNights },
  });
}

/** Minimum total bid for a stay (public — no raw weekday map). */
export async function createPlace(req: Request, res: Response) {
  const data = req.body as CreatePlaceInput;

  const threshold = resolvePlaceThresholdPayload({
    minimumBid: data.minimumBid,
    thresholdPricingMode: data.thresholdPricingMode,
    minimumBidByDayOfWeek: data.minimumBidByDayOfWeek,
  });

  try {
    validatePlaceThresholdPricing({
      retailPrice: data.retailPrice,
      ...threshold,
    });
  } catch (err) {
    throw new CustomError(
      err instanceof Error ? err.message : "Invalid threshold pricing",
      400,
    );
  }

  const slug = await generateUniquePlaceSlug(data.name);

  const place = await prisma.place.create({
    data: {
      slug,
      name: data.name,
      shortDescription: data.shortDescription,
      fullDescription: data.fullDescription,
      city: data.city,
      country: data.country,
      address: data.address,
      // Store canonical (lowercased, trimmed) so it reliably matches the
      // Supabase-lowercased hotel-owner account email later.
      email: data.email ? data.email.trim().toLowerCase() : null,
      reservationPhone: data.reservationPhone ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      accommodationType: data.accommodationType,
      retailPrice: data.retailPrice,
      minimumBid: threshold.minimumBid,
      thresholdPricingMode: threshold.thresholdPricingMode,
      minimumBidByDayOfWeek: threshold.minimumBidByDayOfWeek,
      autoAcceptAboveMinimum: true,
      blackoutDates: data.blackoutDates ?? [],
      allowedDaysOfWeek: data.allowedDaysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      maxInventory: data.maxInventory ?? 1,
      mandatoryResortFeeAmount: data.mandatoryResortFeeAmount ?? 0,
      mandatoryParkingFeeAmount: data.mandatoryParkingFeeAmount ?? 0,
      verticalVideoUrl: data.verticalVideoUrl || null,
      neighborhoodGuideText: data.neighborhoodGuideText || null,
      neighborhoodGuideImageUrl: data.neighborhoodGuideImageUrl || null,
      keywords: data.keywords ?? [],
      timezone:
        data.timezone?.trim() ||
        inferTimezoneFromLocation(data.city, data.country),
      status: data.status ?? "DRAFT",
      images: {
        create: data.images.map((img, index) => ({
          url: img.url,
          order: img.order ?? index,
        })),
      },
    },
    include: { images: { orderBy: { order: "asc" } } },
  });

  // Send email to hotel if an email was provided
  if (data.email) {
    await notifyHotelOnPlaceCreated({
      placeEmail: data.email,
      placeName: place.name,
      placeCity: place.city,
      placeCountry: place.country,
    });
  }

  res.status(201).json({
    message: "Place created successfully",
    data: { place: formatPlace(place) },
  });
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function notifyHotelOnPlaceCreated({
  placeEmail,
  placeName,
  placeCity,
  placeCountry,
}: {
  placeEmail: string;
  placeName: string;
  placeCity: string;
  placeCountry: string;
}) {
  // Check if a hotel user account already exists for this email
  const existingUser = await prisma.users.findFirst({
    where: { email: placeEmail },
  });

  if (existingUser) {
    // User already has an account — send a simple notification
    await sendEmail({
      type: EmailType.HOTEL_PLACE_CREATED,
      to: placeEmail,
      subject: `New property listed: ${placeName}`,
      variables: {
        placeName,
        placeCity,
        placeCountry,
        dashboardUrl: `${APP_URL}/hotel/dashboard`,
        appName: "Deadline",
      },
    });
  } else {
    // New hotel — generate an invite token and send the signup link
    const token = await createHotelInviteToken(placeEmail);
    const inviteUrl = `${APP_URL}/hotel/signup?token=${token}`;

    await sendEmail({
      type: EmailType.HOTEL_INVITE,
      to: placeEmail,
      subject: `You're invited to list ${placeName} on Deadline`,
      variables: {
        placeName,
        placeCity,
        placeCountry,
        inviteUrl,
        expiryDays: HOTEL_INVITE_EXPIRY_DAYS,
        appName: "Deadline",
      },
    });
  }
}

// Update place
export async function updatePlace(req: Request, res: Response) {
  const { id } = req.params;
  const data = req.body as UpdatePlaceInput;

  // Check if place exists
  const existingPlace = await prisma.place.findUnique({ where: { id } });
  if (!existingPlace) {
    throw new CustomError("Place not found", 404);
  }

  // Validate threshold pricing against retail price
  const retailPrice = data.retailPrice ?? existingPlace.retailPrice;
  const threshold = resolvePlaceThresholdPayload({
    minimumBid: data.minimumBid ?? existingPlace.minimumBid,
    thresholdPricingMode:
      data.thresholdPricingMode ?? existingPlace.thresholdPricingMode,
    minimumBidByDayOfWeek:
      data.minimumBidByDayOfWeek ??
      existingPlace.minimumBidByDayOfWeek.map(Number),
  });

  try {
    validatePlaceThresholdPricing({
      retailPrice,
      ...threshold,
    });
  } catch (err) {
    throw new CustomError(
      err instanceof Error ? err.message : "Invalid threshold pricing",
      400,
    );
  }

  const slug =
    data.name && data.name !== existingPlace.name
      ? await generateUniquePlaceSlug(data.name, id)
      : undefined;

  // Handle images update - delete old images and create new ones if provided
  if (data.images && data.images.length > 0) {
    await prisma.placeImage.deleteMany({ where: { placeId: id } });
  }

  const place = await prisma.place.update({
    where: { id },
    data: {
      ...(slug && { slug }),
      ...(data.name && { name: data.name }),
      ...(data.shortDescription && { shortDescription: data.shortDescription }),
      ...(data.fullDescription && { fullDescription: data.fullDescription }),
      ...(data.city && { city: data.city }),
      ...(data.country && { country: data.country }),
      ...(data.address && { address: data.address }),
      ...(data.email !== undefined && {
        email: data.email ? data.email.trim().toLowerCase() : null,
      }),
      ...(data.reservationPhone !== undefined && {
        reservationPhone: data.reservationPhone,
      }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.accommodationType && {
        accommodationType: data.accommodationType,
      }),
      ...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
      minimumBid: threshold.minimumBid,
      thresholdPricingMode: threshold.thresholdPricingMode,
      minimumBidByDayOfWeek: threshold.minimumBidByDayOfWeek,
      autoAcceptAboveMinimum: true,
      ...(data.blackoutDates && { blackoutDates: data.blackoutDates }),
      ...(data.allowedDaysOfWeek && {
        allowedDaysOfWeek: data.allowedDaysOfWeek,
      }),
      ...(data.maxInventory !== undefined && {
        maxInventory: data.maxInventory,
      }),
      ...(data.mandatoryResortFeeAmount !== undefined && {
        mandatoryResortFeeAmount: data.mandatoryResortFeeAmount,
      }),
      ...(data.mandatoryParkingFeeAmount !== undefined && {
        mandatoryParkingFeeAmount: data.mandatoryParkingFeeAmount,
      }),
      ...(data.verticalVideoUrl !== undefined && {
        verticalVideoUrl: data.verticalVideoUrl || null,
      }),
      ...(data.neighborhoodGuideText !== undefined && {
        neighborhoodGuideText: data.neighborhoodGuideText || null,
      }),
      ...(data.neighborhoodGuideImageUrl !== undefined && {
        neighborhoodGuideImageUrl: data.neighborhoodGuideImageUrl || null,
      }),
      ...(data.keywords !== undefined && { keywords: data.keywords }),
      ...(data.timezone !== undefined && {
        timezone:
          data.timezone?.trim() ||
          inferTimezoneFromLocation(
            data.city ?? existingPlace.city,
            data.country ?? existingPlace.country,
          ),
      }),
      ...((data.city || data.country) &&
        data.timezone === undefined && {
          timezone: inferTimezoneFromLocation(
            data.city ?? existingPlace.city,
            data.country ?? existingPlace.country,
          ),
        }),
      ...(data.status && { status: data.status }),
      ...(data.images &&
        data.images.length > 0 && {
          images: {
            create: data.images.map((img, index) => ({
              url: img.url,
              order: img.order ?? index,
            })),
          },
        }),
    },
    include: { images: { orderBy: { order: "asc" } } },
  });

  // Send email notification if email was added or changed
  if (data.email && data.email !== existingPlace.email) {
    await notifyHotelOnPlaceCreated({
      placeEmail: data.email,
      placeName: place.name,
      placeCity: place.city,
      placeCountry: place.country,
    });
  }

  res.status(200).json({
    message: "Place updated successfully",
    data: { place: formatPlace(place) },
  });
}

// Update place status only
export async function updatePlaceStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body as UpdatePlaceStatusInput;

  // Check if place exists
  const existingPlace = await prisma.place.findUnique({ where: { id } });
  if (!existingPlace) {
    throw new CustomError("Place not found", 404);
  }

  const place = await prisma.place.update({
    where: { id },
    data: { status },
    include: { images: { orderBy: { order: "asc" } } },
  });

  res.status(200).json({
    message: "Place status updated successfully",
    data: { place: formatPlace(place) },
  });
}

// Delete place
export async function deletePlace(req: Request, res: Response) {
  const { id } = req.params;

  // Check if place exists
  const existingPlace = await prisma.place.findUnique({ where: { id } });
  if (!existingPlace) {
    throw new CustomError("Place not found", 404);
  }

  await prisma.place.delete({ where: { id } });

  res.status(200).json({
    message: "Place deleted successfully",
  });
}

// Get price range of LIVE places (for filters)
export async function getPriceRange(req: Request, res: Response) {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  const result = await prisma.place.aggregate({
    where: { status: PlaceStatus.LIVE },
    _min: { retailPrice: true },
    _max: { retailPrice: true },
  });

  res.status(200).json({
    data: {
      minPrice: result._min.retailPrice ?? 0,
      maxPrice: result._max.retailPrice ?? 0,
    },
  });
}

export async function resendHotelInvite(req: Request, res: Response) {
  const { placeId } = req.body;

  if (!placeId) {
    throw new CustomError("placeId is required", 400);
  }

  // Fetch the place to get its email, name, city, country
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { email: true, name: true, city: true, country: true },
  });

  if (!place) {
    throw new CustomError("Place not found", 404);
  }

  if (!place.email) {
    throw new CustomError("This place has no email address on file", 400);
  }

  // Reject if a user account already exists for this email —
  // they should just log in, not go through the invite flow again
  const { data: existingUser } = await supabase.rpc("get_user_by_email", {
    email: place.email,
  });

  if (existingUser) {
    throw new CustomError(
      "A hotel account already exists for this email. The owner should log in directly.",
      400,
    );
  }

  // Generate a fresh token (upserts, so any expired/unused old token is replaced)
  const token = await createHotelInviteToken(place.email);
  const inviteUrl = `${APP_URL}/hotel/signup?token=${token}`;

  await sendEmail({
    type: EmailType.HOTEL_INVITE,
    to: place.email,
    subject: `You're invited to list ${place.name} on Deadline`,
    variables: {
      placeName: place.name,
      placeCity: place.city,
      placeCountry: place.country,
      inviteUrl,
      expiryDays: HOTEL_INVITE_EXPIRY_DAYS,
      appName: "Deadline",
    },
  });

  return res.status(200).json({
    message: `Invite resent to ${place.email}`,
  });
}

export async function getHotelDashboardStats(req: Request, res: Response) {
  const placeId = req.query.placeId as string;

  if (!placeId) {
    throw new CustomError("placeId is required", 400);
  }

  const [earningsStats, bookingStats, propertyStats, propertyBreakdown] =
    await Promise.all([
      supabase.rpc("hotel_earnings_stats", { p_place_id: placeId }),
      supabase.rpc("hotel_booking_stats", { p_place_id: placeId }),
      supabase.rpc("hotel_property_stats", { p_place_id: placeId }),
      supabase.rpc("hotel_property_breakdown", { p_place_id: placeId }),
    ]);

  if (earningsStats.error)
    throw new CustomError(earningsStats.error.message, 400);
  if (bookingStats.error)
    throw new CustomError(bookingStats.error.message, 400);
  if (propertyStats.error)
    throw new CustomError(propertyStats.error.message, 400);
  if (propertyBreakdown.error)
    throw new CustomError(propertyBreakdown.error.message, 400);

  const data = {
    ...earningsStats.data,
    ...bookingStats.data,
    ...propertyStats.data,
    propertyStats: propertyBreakdown.data,
  };

  res.status(200).json({ data });
}
