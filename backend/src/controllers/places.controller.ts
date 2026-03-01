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
import { createHotelInviteToken } from "../libs/utils/inviteToken";
import { supabase } from "../libs/config/supabase";

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
  name: place.name,
  email: place.email,
  shortDescription: place.shortDescription,
  fullDescription: place.fullDescription,
  city: place.city,
  country: place.country,
  address: place.address,
  images: place.images || [],
  accommodationType: place.accommodationType,
  retailPrice: place.retailPrice,
  minimumBid: place.minimumBid,
  autoAcceptAboveMinimum: place.autoAcceptAboveMinimum,
  blackoutDates: place.blackoutDates || [],
  allowedDaysOfWeek: place.allowedDaysOfWeek || [0, 1, 2, 3, 4, 5, 6],
  maxInventory: place.maxInventory || 1,
  status: place.status,
  createdAt: place.createdAt,
  updatedAt: place.updatedAt,
  latitude: place.latitude,
  longitude: place.longitude,
  // Include inventory info if provided
  ...(inventoryInfo && {
    availableInventory: inventoryInfo.availableInventory,
    isInventoryExhausted: inventoryInfo.isInventoryExhausted,
  }),
});

// Helper to count accepted bids for a place on a specific date
// A bid is considered to occupy a date if the date falls within [checkInDate, checkOutDate)
async function getAcceptedBidsCountForDate(
  placeId: string,
  date: string,
): Promise<number> {
  const targetDate = new Date(date);

  const count = await prisma.bid.count({
    where: {
      placeId,
      status: bid_status.ACCEPTED,
      checkInDate: { lte: targetDate },
      checkOutDate: { gt: targetDate },
    },
  });

  return count;
}

// Helper to check inventory availability for a place on a specific date
async function getInventoryStatus(
  place: { id: string; maxInventory: number },
  date: string,
): Promise<{ availableInventory: number; isInventoryExhausted: boolean }> {
  const acceptedBidsCount = await getAcceptedBidsCountForDate(place.id, date);
  const availableInventory = Math.max(
    0,
    place.maxInventory - acceptedBidsCount,
  );

  return {
    availableInventory,
    isInventoryExhausted: availableInventory === 0,
  };
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
    email: hotelEmail,
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

  // Filter out places with blackoutDates containing the requested date
  if (date) {
    const isWithin = (blackout: any) =>
      blackout.start <= date && blackout.end >= date;
    places = places.filter((place) =>
      !Array.isArray(place.blackoutDates)
        ? true
        : !place.blackoutDates.some(isWithin),
    );
  }

  // If date is provided, filter out places with exhausted inventory
  if (date) {
    const placesWithInventory = await Promise.all(
      places.map(async (place) => {
        const inventoryStatus = await getInventoryStatus(place, date);
        return { place, inventoryStatus };
      }),
    );

    // Filter out places with exhausted inventory
    const availablePlaces = placesWithInventory.filter(
      (item) => !item.inventoryStatus.isInventoryExhausted,
    );

    places = availablePlaces.map((item) => item.place);
  }

  total = places.length;

  res.status(200).json({
    data: {
      places: places.map((p) => formatPlace(p)),
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
  const { id } = req.params;
  const { date } = req.query as { date?: string };

  const place = await prisma.place.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });

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
    inventoryInfo = await getInventoryStatus(place, date);
  }

  res.status(200).json({
    data: {
      place: formatPlace(place, inventoryInfo),
      // Include a clear message if inventory is exhausted
      ...(inventoryInfo?.isInventoryExhausted && {
        inventoryMessage:
          "Inventory sold out for this day, try a different date or place",
      }),
    },
  });
}

export async function createPlace(req: Request, res: Response) {
  const data = req.body as CreatePlaceInput;

  // Validate minimumBid < retailPrice
  if (data.minimumBid >= data.retailPrice) {
    throw new CustomError("Minimum bid must be less than retail price", 400);
  }

  const place = await prisma.place.create({
    data: {
      name: data.name,
      shortDescription: data.shortDescription,
      fullDescription: data.fullDescription,
      city: data.city,
      country: data.country,
      address: data.address,
      email: data.email ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      accommodationType: data.accommodationType,
      retailPrice: data.retailPrice,
      minimumBid: data.minimumBid,
      autoAcceptAboveMinimum: data.autoAcceptAboveMinimum ?? true,
      blackoutDates: data.blackoutDates ?? [],
      allowedDaysOfWeek: data.allowedDaysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      maxInventory: data.maxInventory ?? 1,
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
      },
    });
  } else {
    // New hotel — generate an invite token and send the signup link
    const token = await createHotelInviteToken(placeEmail);
    const inviteUrl = `${APP_URL}/hotel/signup?token=${token}`;

    await sendEmail({
      type: EmailType.HOTEL_INVITE,
      to: placeEmail,
      subject: `You're invited to list ${placeName} on Death is a Deadline`,
      variables: {
        placeName,
        placeCity,
        placeCountry,
        inviteUrl,
        expiryMinutes: 15,
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

  // Validate minimumBid < retailPrice if both are provided
  const retailPrice = data.retailPrice ?? existingPlace.retailPrice;
  const minimumBid = data.minimumBid ?? existingPlace.minimumBid;
  if (minimumBid >= retailPrice) {
    throw new CustomError("Minimum bid must be less than retail price", 400);
  }

  // Handle images update - delete old images and create new ones if provided
  if (data.images && data.images.length > 0) {
    await prisma.placeImage.deleteMany({ where: { placeId: id } });
  }

  const place = await prisma.place.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.shortDescription && { shortDescription: data.shortDescription }),
      ...(data.fullDescription && { fullDescription: data.fullDescription }),
      ...(data.city && { city: data.city }),
      ...(data.country && { country: data.country }),
      ...(data.address && { address: data.address }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.accommodationType && {
        accommodationType: data.accommodationType,
      }),
      ...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
      ...(data.minimumBid !== undefined && { minimumBid: data.minimumBid }),
      ...(data.autoAcceptAboveMinimum !== undefined && {
        autoAcceptAboveMinimum: data.autoAcceptAboveMinimum,
      }),
      ...(data.blackoutDates && { blackoutDates: data.blackoutDates }),
      ...(data.allowedDaysOfWeek && {
        allowedDaysOfWeek: data.allowedDaysOfWeek,
      }),
      ...(data.maxInventory !== undefined && {
        maxInventory: data.maxInventory,
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
    subject: `You're invited to list ${place.name} on Death is a Deadline`,
    variables: {
      placeName: place.name,
      placeCity: place.city,
      placeCountry: place.country,
      inviteUrl,
      expiryMinutes: 15,
    },
  });

  return res.status(200).json({
    message: `Invite resent to ${place.email}`,
  });
}

export async function getHotelDashboardStats(req: Request, res: Response) {
  const hotelEmail = req.user?.email;

  if (!hotelEmail) {
    throw new CustomError("Could not determine hotel identity", 400);
  }

  const [earningsStats, bookingStats, propertyStats, propertyBreakdown] =
    await Promise.all([
      supabase.rpc("hotel_earnings_stats", { p_email: hotelEmail }),
      supabase.rpc("hotel_booking_stats", { p_email: hotelEmail }),
      supabase.rpc("hotel_property_stats", { p_email: hotelEmail }),
      supabase.rpc("hotel_property_breakdown", { p_email: hotelEmail }),
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
