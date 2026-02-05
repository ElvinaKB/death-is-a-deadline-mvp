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
} from "../validations/places/places.validation";
import { UserRole } from "../types/auth.types";

const router = Router();

// Public route - list all LIVE places (for students marketplace)
router.get(
  "/public",
  validate(publicPlacesQuerySchema, "query"),
  placesController.listPublicPlaces,
);

// Public route - get price range of LIVE places (for filters)
router.get("/public/price-range", placesController.getPriceRange);

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
  placesController.updatePlace,
);

// PATCH /api/places/:id/status - Update place status only
router.patch(
  "/:id/status",
  validate(placeIdParamSchema, "params"),
  validate(updatePlaceStatusSchema),
  placesController.updatePlaceStatus,
);

// DELETE /api/places/:id - Delete place
router.delete(
  "/:id",
  validate(placeIdParamSchema, "params"),
  placesController.deletePlace,
);

export { router };
