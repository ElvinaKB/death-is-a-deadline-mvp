import { z } from "zod";

export const studentIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});

export const studentApproveRejectSchema = z.object({
  id: z.string().uuid({ message: "Invalid student id" }),
});
