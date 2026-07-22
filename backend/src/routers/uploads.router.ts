import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { rateLimit } from "../libs/middlewares/rateLimit";
import { uploadUrlSchema } from "../validations/uploads/uploads.validation";
import { createUploadUrl } from "../controllers/uploads.controller";

const router = Router();

// Authenticated (any role) signed-upload-URL minting for place photos and
// profile avatars. Keyed per-user by the rate limiter; 30/min comfortably
// covers a multi-image place upload (one mint call per file) while bounding
// abuse.
const uploadRateLimit = rateLimit({ window: "1 m", max: 30, keyPrefix: "upload" });

router.post(
  "/upload-url",
  authenticate(),
  uploadRateLimit,
  validate(uploadUrlSchema),
  createUploadUrl,
);

export { router };
