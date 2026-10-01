import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  getQuote,
  listMarkets,
  requireCronSecret,
  runImport,
} from "../controllers/wholesale.controller";

const router = Router();

// Members-only live price for a wholesale hotel (closed user group).
router.get("/quote/:id", authenticate(), getQuote);

router.get("/markets", listMarkets);

// Import / refresh one city — admin button, or the nightly scheduler.
router.post("/import", authenticate(UserRole.ADMIN), runImport);
router.post("/import/cron", requireCronSecret, runImport);

export { router };
