import { Router } from "express";
import { validate } from "../libs/middlewares/validate";
import { contactSchema } from "../validations/contact/contact.validation";
import { submitContact } from "../controllers/contact.controller";

const router = Router();

router.post("/", validate(contactSchema), submitContact);

export { router };
