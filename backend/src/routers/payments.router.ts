import { Router } from "express";
import { validate } from "../libs/middlewares/validate";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  createPaymentIntentSchema,
  validatePaymentMethodSchema,
  capturePaymentSchema,
  cancelPaymentSchema,
  paymentIdParamSchema,
  bidIdParamSchema,
  listPaymentsQuerySchema,
} from "../validations/payments/payments.validation";
import {
  createPaymentIntent,
  getPaymentConfig,
  validatePaymentMethod,
  getPaymentForBid,
  getSavedPaymentMethods,
  confirmPaymentStatus,
  handlePaymentWebhook,
  listPayments,
  getPayment,
  capturePayment,
  cancelPayment,
} from "../controllers/payments.controller";

const router = Router();

// ============ WEBHOOK ROUTE ============
// Raw body parsing is handled in app.ts before express.json()
router.post("/webhook", handlePaymentWebhook);

router.get("/config", getPaymentConfig);

// ============ STUDENT ROUTES ============

// Create payment intent for a bid (initiates checkout)
router.post(
  "/create-intent",
  authenticate(UserRole.STUDENT),
  validate(createPaymentIntentSchema, "body"),
  createPaymentIntent
);

router.get(
  "/saved-methods",
  authenticate(UserRole.STUDENT),
  getSavedPaymentMethods,
);

router.post(
  "/validate-method",
  authenticate(UserRole.STUDENT),
  validate(validatePaymentMethodSchema, "body"),
  validatePaymentMethod,
);

// Get payment status for a bid
router.get(
  "/bid/:bidId",
  authenticate(UserRole.STUDENT),
  validate(bidIdParamSchema, "params"),
  getPaymentForBid
);

// Read-only payment sync after Stripe.js (webhook writes status)
router.post(
  "/:id/confirm",
  authenticate(UserRole.STUDENT),
  validate(paymentIdParamSchema, "params"),
  confirmPaymentStatus
);

// ============ ADMIN ROUTES ============

// List all payments (admin only)
router.get(
  "/",
  authenticate(UserRole.ADMIN),
  validate(listPaymentsQuerySchema, "query"),
  listPayments
);

// Get single payment by ID (admin only)
router.get(
  "/:id",
  authenticate(UserRole.ADMIN),
  validate(paymentIdParamSchema, "params"),
  getPayment
);

// Capture payment - charge the customer (admin only)
router.post(
  "/:id/capture",
  authenticate(UserRole.ADMIN),
  validate(paymentIdParamSchema, "params"),
  validate(capturePaymentSchema, "body"),
  capturePayment
);

// Cancel payment - release the hold (admin only)
router.post(
  "/:id/cancel",
  authenticate(UserRole.ADMIN),
  validate(paymentIdParamSchema, "params"),
  validate(cancelPaymentSchema, "body"),
  cancelPayment
);

export { router };
