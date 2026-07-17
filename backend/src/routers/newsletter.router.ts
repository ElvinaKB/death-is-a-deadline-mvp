import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { newsletterSubscribeSchema } from "../validations/newsletter/newsletter.validation";
import {
  subscribeNewsletter,
  listNewsletterSubscribers,
} from "../controllers/newsletter.controller";
import { UserRole } from "../types/auth.types";

const router = Router();

router.post("/subscribe", validate(newsletterSubscribeSchema), subscribeNewsletter);
router.get("/", authenticate(UserRole.ADMIN), listNewsletterSubscribers);

export { router };
