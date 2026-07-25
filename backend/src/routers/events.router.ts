import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { rateLimit } from "../libs/middlewares/rateLimit";
import { placeViewSchema } from "../validations/events/events.validation";
import { recordPlaceView } from "../controllers/events.controller";
import { UserRole } from "../types/auth.types";

const router = Router();

// A traveler browses many listings, so allow a generous per-user rate; the
// general /api floor also applies.
const viewRateLimit = rateLimit({ window: "1 m", max: 60, keyPrefix: "place-view" });

router.post(
  "/place-view",
  authenticate(UserRole.STUDENT),
  viewRateLimit,
  validate(placeViewSchema),
  recordPlaceView,
);

export { router };
