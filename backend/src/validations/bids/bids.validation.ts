import { z } from "zod";

// Enum schema
export const bidStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);

// Create bid schema
export const createBidSchema = z
  .object({
    placeId: z.string().min(1, "Place ID is required"),
    checkInDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid check-in date",
    }),
    checkOutDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid check-out date",
    }),
    bidPerNight: z.number().positive("Bid per night must be greater than 0"),
  })
  .refine((data) => new Date(data.checkOutDate) > new Date(data.checkInDate), {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  });

// Update bid status schema (for admin)
export const updateBidStatusSchema = z
  .object({
    status: bidStatusSchema,
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      // If status is REJECTED, rejectionReason is optional but recommended
      return true;
    },
    {
      message: "Rejection reason is recommended when rejecting a bid",
    }
  );

// Param schemas
export const bidIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid bid ID" }),
});

export const placeIdParamSchema = z.object({
  placeId: z.string().min(1, "Place ID is required"),
});

// Query schema for listing bids
export const listBidsQuerySchema = z.object({
  status: bidStatusSchema.optional(),
  placeId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// Query schema for student's own bids
export const myBidsQuerySchema = z.object({
  status: bidStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// Type exports
export type CreateBidInput = z.infer<typeof createBidSchema>;
export type UpdateBidStatusInput = z.infer<typeof updateBidStatusSchema>;
export type ListBidsQuery = z.infer<typeof listBidsQuerySchema>;
export type MyBidsQuery = z.infer<typeof myBidsQuerySchema>;
