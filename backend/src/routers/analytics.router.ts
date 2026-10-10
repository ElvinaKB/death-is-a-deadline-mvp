import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import { exportBidsCsv, placeSummary } from "../controllers/analytics.controller";

const router = Router();

// Admin only — contains member names/emails and every bid.
router.use(authenticate(UserRole.ADMIN));
router.get("/places/:id/summary", placeSummary);
router.get("/bids.csv", exportBidsCsv);

export { router };
