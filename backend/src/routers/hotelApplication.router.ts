import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { rateLimit } from "../libs/middlewares/rateLimit";
import { hotelApplicationSchema } from "../validations/hotelApplication/hotelApplication.validation";
import {
  submitHotelApplication,
  listHotelApplications,
} from "../controllers/hotelApplication.controller";
import { UserRole } from "../types/auth.types";

const router = Router();

// Public, unauthenticated submit — keyed by IP, modest limit on top of the
// general /api floor and the Turnstile check.
const submitRateLimit = rateLimit({
  window: "10 m",
  max: 5,
  keyPrefix: "hotel-application",
});

router.post(
  "/",
  submitRateLimit,
  validate(hotelApplicationSchema),
  submitHotelApplication,
);
router.get("/", authenticate(UserRole.ADMIN), listHotelApplications);

export { router };
