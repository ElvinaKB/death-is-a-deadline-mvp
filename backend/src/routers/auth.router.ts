import { Router } from "express";
import {
  signupSchema,
  loginSchema,
  resubmitSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  hotelSignupSchema,
  linkedinCallbackSchema,
  linkedinCompleteSchema,
} from "../validations/auth/auth.validation";
import {
  signup,
  login,
  resubmit,
  forgotPassword,
  resetPassword,
  hotelSignup,
  linkedinAuthorize,
  linkedinCallback,
  linkedinComplete,
} from "../controllers/auth.controller";
import { validate } from "../libs/middlewares/validate";
import { rateLimit } from "../libs/middlewares/rateLimit";

const router = Router();

// Brute-force / signup-abuse protection — these all run before a user is
// authenticated, so they're keyed by IP.
const authRateLimit = rateLimit({ window: "5 m", max: 5, keyPrefix: "auth" });

router.post("/signup", authRateLimit, validate(signupSchema), signup);
router.post(
  "/signup/hotel",
  authRateLimit,
  validate(hotelSignupSchema),
  hotelSignup,
);
router.post("/login", authRateLimit, validate(loginSchema), login);
router.post("/resubmit", authRateLimit, validate(resubmitSchema), resubmit);
router.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  resetPassword,
);
router.get("/linkedin/authorize", linkedinAuthorize);
router.post(
  "/linkedin/callback",
  validate(linkedinCallbackSchema),
  linkedinCallback,
);
router.post(
  "/linkedin/complete",
  validate(linkedinCompleteSchema),
  linkedinComplete,
);

export { router };
