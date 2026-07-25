import { z } from "zod";

export const placeViewSchema = z.object({
  placeId: z.string().min(1),
});

export type PlaceViewRequest = z.infer<typeof placeViewSchema>;
