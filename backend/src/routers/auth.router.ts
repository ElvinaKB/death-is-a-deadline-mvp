import { Router } from "express";
import {
  signupSchema,
  loginSchema,
  resubmitSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth/auth.validation";
import { signup, login, resubmit, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { validate } from "../libs/middlewares/validate";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/resubmit", validate(resubmitSchema), resubmit);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export { router };
