import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
});

export type NewsletterSubscribeRequest = z.infer<
  typeof newsletterSubscribeSchema
>;
