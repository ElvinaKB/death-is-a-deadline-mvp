import { Router } from "express";
import { signupSchema, loginSchema } from "../validations/auth/auth.validation";
import { signup, login } from "../controllers/auth.controller";
import { validate } from "../libs/middlewares/validate";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export { router };
