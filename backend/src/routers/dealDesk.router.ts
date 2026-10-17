import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  alternatives,
  hotel,
  logCall,
  queue,
  saveContact,
  stats,
} from "../controllers/dealDesk.controller";

const router = Router();

// Admin only — member names/emails and internal price gaps.
router.use(authenticate(UserRole.ADMIN));
router.get("/queue", queue);
router.get("/stats", stats);
router.get("/hotels/:placeId", hotel);
router.put("/hotels/:placeId/contact", saveContact);
router.get("/hotels/:placeId/alternatives", alternatives);
router.post("/calls", logCall);

export { router };
