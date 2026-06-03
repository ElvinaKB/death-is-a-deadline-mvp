import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email is required"),
  topic: z.enum(["general", "hotel"]),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  turnstileToken: z.string().min(1, "Security verification is required").optional(),
});

export type ContactRequest = z.infer<typeof contactSchema>;
