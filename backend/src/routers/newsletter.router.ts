import { Router } from "express";
import { validate } from "../libs/middlewares/validate";
import { newsletterSubscribeSchema } from "../validations/newsletter/newsletter.validation";
import { subscribeNewsletter } from "../controllers/newsletter.controller";

const router = Router();

router.post("/subscribe", validate(newsletterSubscribeSchema), subscribeNewsletter);

export { router };
