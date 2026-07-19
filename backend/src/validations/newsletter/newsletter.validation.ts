import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export type NewsletterSubscribeRequest = z.infer<
  typeof newsletterSubscribeSchema
>;
