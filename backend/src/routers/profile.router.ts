import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  getProfile,
  updateProfile,
  getOrCreateReferralCode,
} from "../controllers/profile.controller";

const router = Router();

router.use(authenticate(UserRole.STUDENT));

router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/referral-code", getOrCreateReferralCode);

export { router };
