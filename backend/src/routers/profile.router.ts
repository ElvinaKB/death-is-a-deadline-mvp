import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  getProfile,
  updateProfile,
  getOrCreateReferralCode,
  getWishlistTally,
} from "../controllers/profile.controller";

const router = Router();

router.get("/", authenticate(UserRole.STUDENT), getProfile);
router.put("/", authenticate(UserRole.STUDENT), updateProfile);
router.post("/referral-code", authenticate(UserRole.STUDENT), getOrCreateReferralCode);
router.get("/wishlist-tally", authenticate(UserRole.ADMIN), getWishlistTally);

export { router };
