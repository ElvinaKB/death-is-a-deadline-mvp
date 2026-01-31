import { z } from "zod";

// Enum schemas
export const accommodationTypeSchema = z.enum([
  "POD_SHARE",
  "HOSTEL",
  "SHARED_APARTMENT",
  "PRIVATE_ROOM",
]);

export const placeStatusSchema = z.enum(["DRAFT", "LIVE", "PAUSED"]);

// Image schema (URL from Supabase storage)
export const placeImageSchema = z.object({
  url: z.string().url(),
  order: z.number().int().min(0).optional(),
});

// Create place schema
export const createPlaceSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  shortDescription: z
    .string()
    .min(1, "Short description is required")
    .max(100, "Short description must be 100 characters or less"),
  fullDescription: z
    .string()
    .min(50, "Full description must be at least 50 characters"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  images: z.array(placeImageSchema).min(1, "At least one image is required"),
  accommodationType: accommodationTypeSchema,
  retailPrice: z.number().min(1, "Retail price must be greater than 0"),
  minimumBid: z.number().min(1, "Minimum bid must be greater than 0"),
  autoAcceptAboveMinimum: z.boolean().optional().default(true),
  blackoutDates: z.array(z.string()).optional().default([]),
  status: placeStatusSchema.optional().default("DRAFT"),
});

// Update place schema (all fields optional except id)
export const updatePlaceSchema = z.object({
  name: z.string().min(3).optional(),
  shortDescription: z.string().min(1).max(100).optional(),
  fullDescription: z.string().min(50).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  images: z.array(placeImageSchema).optional(),
  accommodationType: accommodationTypeSchema.optional(),
  retailPrice: z.number().min(1).optional(),
  minimumBid: z.number().min(1).optional(),
  autoAcceptAboveMinimum: z.boolean().optional(),
  blackoutDates: z.array(z.string()).optional(),
  status: placeStatusSchema.optional(),
});

// Update status only schema
export const updatePlaceStatusSchema = z.object({
  status: placeStatusSchema,
});

// Param schemas
export const placeIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid place id" }),
});

// Query schema for listing
export const listPlacesQuerySchema = z.object({
  status: placeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// Query schema for public places listing (with filters)
export const publicPlacesQuerySchema = z.object({
  searchQuery: z.string().optional(),
  selectedType: z.union([accommodationTypeSchema, z.literal("all")]).optional(),
  priceRange: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return parsed.map(Number) as [number, number];
        }
      } catch {
        return undefined;
      }
      return undefined;
    }),
  sortBy: z.enum(["price-asc", "price-desc"]).optional().default("price-asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  date: z.string().optional(),
});

// Type exports
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;
export type UpdatePlaceStatusInput = z.infer<typeof updatePlaceStatusSchema>;
export type ListPlacesQuery = z.infer<typeof listPlacesQuerySchema>;
export type PublicPlacesQuery = z.infer<typeof publicPlacesQuerySchema>;
