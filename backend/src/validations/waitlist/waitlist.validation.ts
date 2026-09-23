import { z } from "zod";

export const waitlistSignupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  phone: z.string().trim().max(30).optional(),
  // "Where did you hear about us?" often holds a pasted LinkedIn URL, which
  // with share/tracking parameters easily runs past 200 characters.
  source: z.string().trim().max(500).optional(),
  marketingConsent: z.boolean().optional().default(true),
});

export type WaitlistSignupRequest = z.infer<typeof waitlistSignupSchema>;
