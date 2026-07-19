import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  studentIdUrl: z.string().optional(),
  referralCode: z.string().optional(),
});

export const hotelSignupSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(6),
  token: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const resubmitSchema = z.object({
  token: z.string().jwt(),
  studentIdUrl: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

export const linkedinCallbackSchema = z.object({
  code: z.string().min(1),
});

export const linkedinCompleteSchema = z.object({
  verificationToken: z.string().min(1),
  password: z.string().min(6),
  linkedinProfileUrl: z
    .string()
    .url("Enter a valid URL")
    .refine((url) => /linkedin\.com/i.test(url), {
      message: "Enter your LinkedIn profile URL",
    }),
});
