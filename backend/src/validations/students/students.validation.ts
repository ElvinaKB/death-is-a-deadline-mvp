import { z } from "zod";

export const studentIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});

export const studentApproveRejectSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});

export const addStudentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  // Strip whitespace and invisible characters (zero-width spaces, joiners,
  // BOM) that paste/autofill can sneak in — they're invisible on screen but
  // make a valid-looking address fail .email(). Emails never contain these.
  email: z
    .string()
    .transform((v) =>
      v.replace(/[\s​-‍⁠﻿]/g, "").toLowerCase(),
    )
    .pipe(z.string().email("Valid email is required")),
  // Optional contact phone — when provided it's saved to the traveler's
  // profile so the bid form won't ask again and it pushes to the hotel's PMS.
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .refine((v) => (v.match(/\d/g) || []).length >= 7, {
      message: "Enter a valid phone number",
    })
    .optional()
    .or(z.literal("")),
  linkedinProfileUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
});

// Admin correcting a traveler's LinkedIn link. Share/tracking parameters are
// dropped so the stored link is the plain profile URL; "" clears it.
export const updateStudentLinkedinSchema = z.object({
  linkedinProfileUrl: z
    .string()
    .trim()
    .transform((v) => v.split(/[?#]/)[0])
    .pipe(z.string().url("Enter a valid URL").or(z.literal(""))),
});
