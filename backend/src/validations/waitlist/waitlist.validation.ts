import { z } from "zod";

export const waitlistSignupSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(30).optional(),
  source: z.string().max(200).optional(),
  marketingConsent: z.boolean().optional().default(true),
});

export type WaitlistSignupRequest = z.infer<typeof waitlistSignupSchema>;
