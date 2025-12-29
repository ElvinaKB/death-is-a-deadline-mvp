import { Router } from "express";
import {
  signupSchema,
  loginSchema,
  resubmitSchema,
} from "../validations/auth/auth.validation";
import { signup, login, resubmit } from "../controllers/auth.controller";
import { validate } from "../libs/middlewares/validate";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/resubmit", validate(resubmitSchema), resubmit);

export { router };
