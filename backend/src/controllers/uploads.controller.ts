import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { supabase } from "../libs/config/supabase";
import { CustomError } from "../libs/utils/CustomError";

const BUCKET = "student-id-cards";

// Mints a short-lived, single-use Supabase signed-upload token for a
// logged-in Deadline user (any role — gated by the authenticate() middleware
// on the route). Deadline's frontend Supabase client only ever holds the
// anon key (real auth is backend JWT), so authenticated browser uploads
// can't rely on a Supabase "authenticated"-role policy — they go through
// here instead, which authorizes the upload server-side.
export async function createUploadUrl(req: Request, res: Response) {
  const { context, fileExt } = req.body;

  // "place" → hotel/admin place photos, "avatar" → student profile photo.
  const prefix = context === "avatar" ? "avatars" : "places";
  const path = `${prefix}/${randomUUID()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    throw new CustomError("Failed to create upload URL", 500);
  }

  res.status(200).json({ message: "Upload URL created", data });
}
