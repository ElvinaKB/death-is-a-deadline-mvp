import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import * as testimonialsController from "../controllers/testimonials.controller";
import { validate } from "../libs/middlewares/validate";
// TODO: import validation schemas for testimonial CRUD
import { UserRole } from "../types/auth.types";

const router = Router();

// Public: Get testimonials for a place
router.get(
  "/",
  // expects ?placeId=...
  testimonialsController.listTestimonials,
);

// Public: Get review platforms for a place
router.get(
  "/review-platforms",
  // expects ?placeId=...
  testimonialsController.listReviewPlatforms,
);

// Admin only routes
router.use(authenticate(UserRole.ADMIN));

// Create testimonial
router.post(
  "/",
  // expects { placeId, ... }
  testimonialsController.createTestimonial,
);

// Update testimonial
router.put("/:id", testimonialsController.updateTestimonial);

// Delete testimonial
router.delete("/:id", testimonialsController.deleteTestimonial);

// Create review platform
router.post(
  "/review-platforms",
  // expects { placeId, ... }
  testimonialsController.createReviewPlatform,
);

// Update review platform
router.put("/review-platforms/:id", testimonialsController.updateReviewPlatform);

// Delete review platform
router.delete("/review-platforms/:id", testimonialsController.deleteReviewPlatform);

export { router };
