import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  getQuote,
  requireCronSecret,
  runImport,
} from "../controllers/wholesale.controller";

const router = Router();

// Members-only live price for a wholesale hotel (closed user group).
router.get("/quote/:id", authenticate(), getQuote);

// Import / refresh wholesale listings — admin button, or the nightly scheduler.
router.post("/import", authenticate(UserRole.ADMIN), runImport);
router.post("/import/cron", requireCronSecret, runImport);

export { router };
