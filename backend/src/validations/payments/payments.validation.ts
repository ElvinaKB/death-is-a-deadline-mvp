import { z } from "zod";

// Payment status enum
export const paymentStatusSchema = z.enum([
  "PENDING",
  "REQUIRES_ACTION",
  "AUTHORIZED",
  "CAPTURED",
  "CANCELLED",
  "FAILED",
  "EXPIRED",
]);

// Create payment intent (for student checkout)
export const createPaymentIntentSchema = z.object({
  bidId: z.string().uuid({ message: "Invalid bid ID" }),
});

// Confirm payment (after card details entered)
export const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid({ message: "Invalid payment ID" }),
  paymentMethodId: z.string().min(1, "Payment method ID is required"),
});

// Capture payment (admin action)
export const capturePaymentSchema = z.object({
  adminNotes: z.string().optional(),
});

// Cancel payment (admin action)
export const cancelPaymentSchema = z.object({
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
});

// Param schemas
export const paymentIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid payment ID" }),
});

export const bidIdParamSchema = z.object({
  bidId: z.string().uuid({ message: "Invalid bid ID" }),
});

// Query schema for listing payments
export const listPaymentsQuerySchema = z.object({
  status: paymentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// Type exports
export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
