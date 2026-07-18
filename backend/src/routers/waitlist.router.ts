import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { waitlistSignupSchema } from "../validations/waitlist/waitlist.validation";
import { joinWaitlist, listWaitlistSignups } from "../controllers/waitlist.controller";
import { UserRole } from "../types/auth.types";

const router = Router();

router.post("/", validate(waitlistSignupSchema), joinWaitlist);
router.get("/", authenticate(UserRole.ADMIN), listWaitlistSignups);

export { router };
