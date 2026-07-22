import { z } from "zod";

export const uploadUrlSchema = z.object({
  context: z.enum(["place", "avatar"]),
  fileExt: z.enum(["jpg", "jpeg", "png", "webp"]),
});
