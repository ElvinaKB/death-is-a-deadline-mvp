import { Router } from "express";
import { validate } from "../libs/middlewares/validate";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import {
  createPaymentIntentSchema,
  capturePaymentSchema,
  cancelPaymentSchema,
  paymentIdParamSchema,
  bidIdParamSchema,
  listPaymentsQuerySchema,
} from "../validations/payments/payments.validation";
import {
  createPaymentIntent,
  getPaymentForBid,
  confirmPaymentStatus,
  handlePaymentWebhook,
  listPayments,
  getPayment,
  capturePayment,
  cancelPayment,
} from "../controllers/payments.controller";
import express from "express";

const router = Router();

// ============ WEBHOOK ROUTE (must be before other middleware) ============
// Stripe webhook needs raw body, so we use express.raw() middleware
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handlePaymentWebhook
);

// ============ STUDENT ROUTES ============

// Create payment intent for a bid (initiates checkout)
router.post(
  "/create-intent",
  authenticate(UserRole.STUDENT),
  validate(createPaymentIntentSchema, "body"),
  createPaymentIntent
);

// Get payment status for a bid
router.get(
  "/bid/:bidId",
  authenticate(UserRole.STUDENT),
  validate(bidIdParamSchema, "params"),
  getPaymentForBid
);

// Confirm payment status after frontend card confirmation
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
