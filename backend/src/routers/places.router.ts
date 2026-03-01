import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import * as placesController from "../controllers/places.controller";
import { validate } from "../libs/middlewares/validate";
import {
  createPlaceSchema,
  updatePlaceSchema,
  updatePlaceStatusSchema,
  placeIdParamSchema,
  listPlacesQuerySchema,
  publicPlacesQuerySchema,
  resendHotelInviteSchema,
} from "../validations/places/places.validation";
import { UserRole } from "../types/auth.types";

const router = Router();

// GET /api/places - List all places (hotel)
router.get(
  "/hotel",
  validate(listPlacesQuerySchema, "query"),
  authenticate(UserRole.HOTEL_OWNER),
  placesController.listHotelPlaces,
);

router.get(
  "/hotel-stats",
  authenticate(UserRole.HOTEL_OWNER),
  placesController.getHotelDashboardStats,
);

// Public route - list all LIVE places (for students marketplace)
router.get(
  "/public",
  validate(publicPlacesQuerySchema, "query"),
  placesController.listPublicPlaces,
);

// Public route - get price range of LIVE places (for filters)
router.get("/public/price-range", placesController.getPriceRange);

router.post(
  "/resend-invite",
  validate(resendHotelInviteSchema),
  authenticate(UserRole.HOTEL_OWNER),
  placesController.resendHotelInvite,
);

// Public route - get single place by ID (for students - includes inventory status)
router.get(
  "/public/:id",
  validate(placeIdParamSchema, "params"),
  placesController.getPublicPlace,
);

// GET /api/places/:id - Get place by ID (admin - no inventory filtering)
router.get(
  "/:id",
  validate(placeIdParamSchema, "params"),
  placesController.getPlace,
);

// Admin only routes
router.use(authenticate(UserRole.ADMIN));

// GET /api/places - List all places (admin)
router.get(
  "/",
  validate(listPlacesQuerySchema, "query"),
  placesController.listPlaces,
);

// POST /api/places - Create new place
router.post("/", validate(createPlaceSchema), placesController.createPlace);

// PUT /api/places/:id - Update place
router.put(
  "/:id",
  validate(placeIdParamSchema, "params"),
  validate(updatePlaceSchema),
  authenticate(UserRole.ADMIN, UserRole.HOTEL_OWNER), // Allow both admin and hotel owner to update place details
  placesController.updatePlace,
);

// PATCH /api/places/:id/status - Update place status only
router.patch(
  "/:id/status",
  validate(placeIdParamSchema, "params"),
  validate(updatePlaceStatusSchema),
  authenticate(UserRole.ADMIN), // Allow only admin to update place status
  placesController.updatePlaceStatus,
);

// DELETE /api/places/:id - Delete place
router.delete(
  "/:id",
  validate(placeIdParamSchema, "params"),
  authenticate(UserRole.ADMIN), // Allow admin  to delete place
  placesController.deletePlace,
);

export { router };
