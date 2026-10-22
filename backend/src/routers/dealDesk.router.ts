import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import { requireCronSecret } from "../controllers/wholesale.controller";
import {
  alternatives,
  nearMissCron,
  hotel,
  hotelInsights,
  insights,
  saveRule,
  logCall,
  queue,
  saveContact,
  stats,
} from "../controllers/dealDesk.controller";

const router = Router();

// Cron: near-miss email (shared cron secret, before the admin gate).
router.post("/near-miss/cron", requireCronSecret, nearMissCron);

// Admin only — member names/emails and internal price gaps.
router.use(authenticate(UserRole.ADMIN));
router.get("/queue", queue);
router.get("/stats", stats);
router.get("/hotels/:placeId", hotel);
router.put("/hotels/:placeId/contact", saveContact);
router.get("/hotels/:placeId/alternatives", alternatives);
router.post("/calls", logCall);
router.get("/insights", insights);
router.get("/hotels/:placeId/insights", hotelInsights);
router.put("/hotels/:placeId/rule", saveRule);

export { router };
