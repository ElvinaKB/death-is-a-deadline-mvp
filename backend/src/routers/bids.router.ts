import { Router } from "express";
import { validate } from "../libs/middlewares/validate";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  createBidSchema,
  updateBidStatusSchema,
  bidIdParamSchema,
  placeIdParamSchema,
  listBidsQuerySchema,
  myBidsQuerySchema,
} from "../validations/bids/bids.validation";
import {
  createBid,
  getMyBids,
  getBidForPlace,
  getBid,
  listBids,
  updateBidStatus,
  updatePayout,
  listHotelBids,
} from "../controllers/bids.controller";

const router = Router();

// Hotel routes
// List all bids (hotel owner only)
router.get(
  "/hotel",
  authenticate(UserRole.HOTEL_OWNER),
  validate(listBidsQuerySchema, "query"),
  listHotelBids,
);

// Student routes
// Create a new bid (student only)
router.post(
  "/",
  authenticate(UserRole.STUDENT),
  validate(createBidSchema, "body"),
  createBid,
);

// Get student's own bids
router.get(
  "/my",
  authenticate(UserRole.STUDENT),
  validate(myBidsQuerySchema, "query"),
  getMyBids,
);

// Get student's existing bid for a specific place
router.get(
  "/place/:placeId",
  authenticate(UserRole.STUDENT),
  validate(placeIdParamSchema, "params"),
  getBidForPlace,
);

// Get single bid by ID (student can view own, admin can view all)
router.get(
  "/:id",
  authenticate(UserRole.STUDENT, UserRole.ADMIN),
  validate(bidIdParamSchema, "params"),
  getBid,
);

// Admin routes
// List all bids (admin only)
router.get(
  "/",
  authenticate(UserRole.ADMIN),
  validate(listBidsQuerySchema, "query"),
  listBids,
);

// Update bid status (admin only)
router.patch(
  "/:id/status",
  authenticate(UserRole.ADMIN),
  validate(bidIdParamSchema, "params"),
  validate(updateBidStatusSchema, "body"),
  updateBidStatus,
);

// Update payout status (admin only)
router.patch(
  "/:id/payout",
  authenticate(UserRole.ADMIN),
  validate(bidIdParamSchema, "params"),
  updatePayout,
);

export { router };
