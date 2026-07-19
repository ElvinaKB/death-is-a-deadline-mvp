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

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signup/hotel", validate(hotelSignupSchema), hotelSignup);
router.post("/login", validate(loginSchema), login);
router.post("/resubmit", validate(resubmitSchema), resubmit);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
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
