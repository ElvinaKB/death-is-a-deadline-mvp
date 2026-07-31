import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  listReferrers,
  createReferrer,
  assignPlaceReferrer,
  setReferrerPassword,
  getMyReferrer,
  submitMyTaxDetails,
} from "../controllers/referrers.controller";

const router = Router();

// Admin — manage referrers + attach them to listings.
router.get("/", authenticate(UserRole.ADMIN), listReferrers);
router.post("/", authenticate(UserRole.ADMIN), createReferrer);
router.patch("/place/:id", authenticate(UserRole.ADMIN), assignPlaceReferrer);
router.post("/:id/set-password", authenticate(UserRole.ADMIN), setReferrerPassword);

// Affiliate self-service — the logged-in user's own portal (returns null if
// they aren't a referrer).
router.get("/me", authenticate(UserRole.STUDENT, UserRole.ADMIN), getMyReferrer);
router.post(
  "/me/tax",
  authenticate(UserRole.STUDENT, UserRole.ADMIN),
  submitMyTaxDetails,
);

export { router };
