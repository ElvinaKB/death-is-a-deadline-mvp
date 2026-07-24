import { z } from "zod";

export const hotelApplicationSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required").max(200),
  address: z.string().min(1, "Address is required").max(300),
  phone: z.string().min(1, "Phone is required").max(40),
  email: z.string().email("Valid reservations email is required"),
  // 0=Sun..6=Sat, matching Place.allowedDaysOfWeek.
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one day"),
  roomsPerDay: z.number().int().min(1, "At least one room"),
  secretPrice: z.number().positive("Enter a price").optional(),
  pms: z.array(z.enum(["cloudbeds", "siteminder", "other"])).default([]),
  pmsOther: z.string().max(120).optional(),
  turnstileToken: z.string().min(1).optional(),
});

export type HotelApplicationRequest = z.infer<typeof hotelApplicationSchema>;
