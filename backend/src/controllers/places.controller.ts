import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { PlaceStatus, Prisma } from "@prisma/client";
import {
  CreatePlaceInput,
  UpdatePlaceInput,
  UpdatePlaceStatusInput,
  ListPlacesQuery,
  PublicPlacesQuery,
} from "../validations/places/places.validation";

// Helper to format place response
const formatPlace = (place: any) => ({
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
  status: place.status,
  createdAt: place.createdAt,
  updatedAt: place.updatedAt,
  latitude: place.latitude,
  longitude: place.longitude,
});

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

  res.status(200).json({
    data: {
      places: places.map(formatPlace),
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
    priceRange,
    sortBy = "price-asc",
    page = 1,
    limit = 12,
  } = req.query as unknown as PublicPlacesQuery;

  const skip = (page - 1) * limit;

  // Build where clause - only LIVE places
  const where: Prisma.PlaceWhereInput = {
    status: PlaceStatus.LIVE,
  };

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

  // Build orderBy
  const orderBy: Prisma.PlaceOrderByWithRelationInput =
    sortBy === "price-desc" ? { retailPrice: "desc" } : { retailPrice: "asc" };

  console.log("Where:", where);
  const [places, total] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.place.count({ where }),
  ]);

  res.status(200).json({
    data: {
      places: places.map(formatPlace),
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

// Create new place
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

  res.status(201).json({
    message: "Place created successfully",
    data: { place: formatPlace(place) },
  });
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
