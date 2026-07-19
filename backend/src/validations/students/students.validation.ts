import { z } from "zod";

export const studentIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});

export const studentApproveRejectSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});

export const addStudentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required"),
  linkedinProfileUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
});
