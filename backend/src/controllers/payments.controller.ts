import { bid_status, payment_status, Prisma } from "@prisma/client";
import { format, eachDayOfInterval } from "date-fns";
import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { stripe, STRIPE_CONFIG } from "../libs/config/stripe";
import { CustomError } from "../libs/utils/CustomError";
import {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentIntentInput,
  ListPaymentsQuery,
  ValidatePaymentMethodInput,
} from "../validations/payments/payments.validation";
import { getBackendStripeMode } from "../libs/utils/stripeMode";
import {
  deriveBookingStatus,
  BOOKING_STATUS_LABELS,
} from "../types/booking.types";
import { ErrorCode } from "../types/error.codes";
import {
  claimStripeEvent,
  processStripeWebhookEvent,
  releaseStripeEvent,
} from "../services/stripeWebhook.service";
import {
  findStripeCustomerIdForStudent,
  getOrCreateStripeCustomerForStudent,
} from "../services/stripeCustomer.service";

/**
 * Check inventory availability for all dates in a bid's date range
 * Returns the first date that is overbooked, or null if all dates have availability
 */
async function checkInventoryForBidDates(
  placeId: string,
  maxInventory: number,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBidId?: string,
): Promise<{
  isOverbooked: boolean;
  overbookedDate?: string;
  availableSlots?: number;
}> {
  // Get all dates in the range (excluding checkout date)
  const dates = eachDayOfInterval({
    start: checkInDate,
    end: new Date(checkOutDate.getTime() - 24 * 60 * 60 * 1000), // Exclude checkout date
  });

  for (const date of dates) {
    const dateStr = date.toISOString().split("T")[0];

    // Count accepted bids that overlap with this date
    const acceptedBidsCount = await prisma.bid.count({
      where: {
        placeId,
        status: bid_status.ACCEPTED,
        checkInDate: { lte: date },
        checkOutDate: { gt: date },
        // Exclude the current bid if provided (for updates)
        ...(excludeBidId && { id: { not: excludeBidId } }),
      },
    });

    const availableSlots = maxInventory - acceptedBidsCount;

    if (availableSlots <= 0) {
      return {
        isOverbooked: true,
        overbookedDate: format(date, "MMM d, yyyy"),
        availableSlots: 0,
      };
    }
  }

  return { isOverbooked: false };
}

// Helper to format payment response
const formatPayment = (payment: any) => ({
  id: payment.id,
  bidId: payment.bidId,
  studentId: payment.studentId,
  amount: Number(payment.amount),
  currency: payment.currency,
  status: payment.status,
  stripePaymentIntentId: payment.stripePaymentIntentId,
  stripeClientSecret: payment.stripeClientSecret,
  authorizedAt: payment.authorizedAt,
  capturedAt: payment.capturedAt,
  cancelledAt: payment.cancelledAt,
  failedAt: payment.failedAt,
  expiresAt: payment.expiresAt,
  failureReason: payment.failureReason,
  adminNotes: payment.adminNotes,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  bid: payment.bid
    ? (() => {
        const bookingStatus = deriveBookingStatus(
          payment.bid.status,
          payment.status,
        );
        return {
        id: payment.bid.id,
        placeId: payment.bid.placeId,
        checkInDate: payment.bid.checkInDate,
        checkOutDate: payment.bid.checkOutDate,
        bidPerNight: Number(payment.bid.bidPerNight),
        totalNights: payment.bid.totalNights,
        totalAmount: Number(payment.bid.totalAmount),
        status: payment.bid.status,
        bookingStatus,
        bookingStatusLabel: BOOKING_STATUS_LABELS[bookingStatus],
        place: payment.bid.place
          ? {
              id: payment.bid.place.id,
              name: payment.bid.place.name,
              city: payment.bid.place.city,
              country: payment.bid.place.country,
              images: payment.bid.place.images || [],
            }
          : undefined,
      };
      })()
    : undefined,
});

/** Public Stripe mode for frontend key-mismatch checks */
export async function getPaymentConfig(_req: Request, res: Response) {
  res.json({
    data: {
      mode: getBackendStripeMode(),
    },
  });
}

/**
 * Pre-flight check before bid submit — catches test cards / key mismatch in live mode
 */
export async function validatePaymentMethod(req: Request, res: Response) {
  const { paymentMethodId } = req.body as ValidatePaymentMethodInput;
  const studentId = req.user!.id;

  try {
    const paymentMethod =
      await stripe.paymentMethods.retrieve(paymentMethodId);

    if (getBackendStripeMode() === "live") {
      const customerId = await findStripeCustomerIdForStudent(studentId);
      if (
        customerId &&
        paymentMethod.customer &&
        paymentMethod.customer !== customerId
      ) {
        throw new CustomError(
          "This saved card cannot be used for this payment.",
          400,
          null,
          ErrorCode.PAYMENT_FORBIDDEN,
        );
      }
    }

    res.json({
      data: {
        valid: true,
        mode: getBackendStripeMode(),
      },
    });
  } catch (err: unknown) {
    const stripeErr = err as { code?: string; type?: string };
    if (stripeErr.code === "resource_missing") {
      throw new CustomError(
        "This card cannot be used with the current payment setup. Test cards are not allowed with live payments, and test/live Stripe keys must match.",
        400,
        null,
        ErrorCode.STRIPE_KEY_MISMATCH,
      );
    }
    throw err;
  }
}

/**
 * Create a PaymentIntent for an accepted bid
 * This is called when a student proceeds to checkout
 */
export async function createPaymentIntent(req: Request, res: Response) {
  const { bidId } = req.body as CreatePaymentIntentInput;
  const studentId = req.user!.id;

  // Get the bid with place info
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      place: true,
      payment: true,
    },
  });

  if (!bid) {
    throw new CustomError("Bid not found", 404, null, ErrorCode.BID_NOT_FOUND);
  }

  // Verify the bid belongs to this student
  if (bid.studentId !== studentId) {
    throw new CustomError(
      "You can only pay for your own bids",
      403,
      null,
      ErrorCode.PAYMENT_FORBIDDEN,
    );
  }

  // Verify the bid is accepted
  if (bid.status !== bid_status.ACCEPTED) {
    throw new CustomError(
      "Only accepted bids can be paid",
      400,
      null,
      ErrorCode.BID_NOT_ACCEPTED,
    );
  }

  // Check inventory availability before creating payment intent
  const inventoryCheck = await checkInventoryForBidDates(
    bid.placeId,
    bid.place.maxInventory,
    new Date(bid.checkInDate),
    new Date(bid.checkOutDate),
    bid.id,
  );

  if (inventoryCheck.isOverbooked) {
    // Reject the bid since inventory is now exhausted
    await prisma.bid.update({
      where: { id: bid.id },
      data: {
        status: bid_status.REJECTED,
        rejectionReason: `Inventory sold out for ${inventoryCheck.overbookedDate}. Another booking was confirmed before yours.`,
      },
    });

    throw new CustomError(
      `Sorry, this place is now fully booked for ${inventoryCheck.overbookedDate}. Your bid has been automatically rejected.`,
      409,
      null,
      ErrorCode.INVENTORY_SOLD_OUT,
    );
  }

  // Check if payment already exists
  if (bid.payment) {
    // If payment exists and is still valid, return it
    if (
      bid.payment.status === payment_status.PENDING ||
      bid.payment.status === payment_status.REQUIRES_ACTION
    ) {
      return res.status(200).json({
        message: "Payment already initiated",
        data: {
          payment: formatPayment(bid.payment),
          clientSecret: bid.payment.stripeClientSecret,
        },
      });
    }

    if (bid.payment.status === payment_status.AUTHORIZED) {
      throw new CustomError(
        "Payment already authorized",
        400,
        null,
        ErrorCode.PAYMENT_ALREADY_AUTHORIZED,
      );
    }

    if (bid.payment.status === payment_status.CAPTURED) {
      throw new CustomError(
        "Payment already captured",
        400,
        null,
        ErrorCode.PAYMENT_ALREADY_CAPTURED,
      );
    }
  }

  // Convert Decimal to number for Stripe (amount in cents)
  const amountInCents = Math.round(Number(bid.totalAmount) * 100);
  const stripeCustomerId = await getOrCreateStripeCustomerForStudent(studentId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: STRIPE_CONFIG.CURRENCY,
    customer: stripeCustomerId,
    setup_future_usage: "off_session",
    capture_method: "automatic",
    metadata: {
      [STRIPE_CONFIG.METADATA_KEYS.BID_ID]: bid.id,
      [STRIPE_CONFIG.METADATA_KEYS.STUDENT_ID]: studentId,
      [STRIPE_CONFIG.METADATA_KEYS.PLACE_ID]: bid.placeId,
      [STRIPE_CONFIG.METADATA_KEYS.CHECK_IN_DATE]:
        bid.checkInDate.toISOString(),
      [STRIPE_CONFIG.METADATA_KEYS.CHECK_OUT_DATE]:
        bid.checkOutDate.toISOString(),
    },
    description: `Bid for ${bid.place.name} - ${bid.totalNights} nights`,
  });

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: { bidId: bid.id },
    create: {
      bidId: bid.id,
      studentId,
      amount: bid.totalAmount,
      currency: STRIPE_CONFIG.CURRENCY,
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      stripeCustomerId,
      status: payment_status.PENDING,
    },
    update: {
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      stripeCustomerId,
      status: payment_status.PENDING,
      failureReason: null,
      failedAt: null,
    },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  res.status(201).json({
    message: "Payment initiated",
    data: {
      payment: formatPayment(payment),
      clientSecret: paymentIntent.client_secret,
    },
  });
}

/**
 * Get payment status for a bid (student)
 */
export async function getPaymentForBid(req: Request, res: Response) {
  const { bidId } = req.params;
  const studentId = req.user!.id;

  const payment = await prisma.payment.findFirst({
    where: { bidId },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  if (!payment) {
    return res.status(200).json({ data: { payment: null } });
  }

  // Verify ownership
  if (payment.studentId !== studentId) {
    throw new CustomError(
      "You can only view your own payments",
      403,
      null,
      ErrorCode.PAYMENT_FORBIDDEN,
    );
  }

  res.status(200).json({
    data: {
      payment: formatPayment(payment),
    },
  });
}

/**
 * Handle Stripe webhook to update payment status (idempotent per event.id — PR 2).
 */
export async function handlePaymentWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new CustomError("Stripe webhook secret not configured", 500);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    throw new CustomError(
      `Webhook signature verification failed: ${err.message}`,
      400,
    );
  }

  const isNewEvent = await claimStripeEvent(event);
  if (!isNewEvent) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    await processStripeWebhookEvent(event);
  } catch (err) {
    await releaseStripeEvent(event.id);
    console.error(`[stripe-webhook] Processing failed for ${event.id}:`, err);
    throw new CustomError("Webhook processing failed", 500);
  }

  res.status(200).json({ received: true });
}

/**
 * Read-only sync after Stripe.js (PR 3 — webhook writes status, commission, emails).
 */
export async function confirmPaymentStatus(req: Request, res: Response) {
  const { id } = req.params;
  const studentId = req.user!.id;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new CustomError(
      "Payment not found",
      404,
      null,
      ErrorCode.PAYMENT_NOT_FOUND,
    );
  }

  if (payment.studentId !== studentId) {
    throw new CustomError(
      "You can only confirm your own payments",
      403,
      null,
      ErrorCode.PAYMENT_FORBIDDEN,
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new CustomError(
      "No payment intent found",
      400,
      null,
      ErrorCode.PAYMENT_NO_INTENT,
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.stripePaymentIntentId,
  );

  const currentPayment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  if (!currentPayment) {
    throw new CustomError(
      "Payment not found",
      404,
      null,
      ErrorCode.PAYMENT_NOT_FOUND,
    );
  }

  const pendingWebhook =
    paymentIntent.status === "succeeded" &&
    currentPayment.status !== payment_status.CAPTURED;

  let message: string;
  if (currentPayment.status === payment_status.CAPTURED) {
    message = "Payment successful. Your booking is confirmed.";
  } else if (pendingWebhook) {
    message =
      "Payment received. Your booking is being confirmed — this usually takes a few seconds.";
  } else if (paymentIntent.status === "requires_action") {
    message = "Additional authentication is required to complete payment.";
  } else {
    message = `Payment status: ${currentPayment.status}`;
  }

  res.status(200).json({
    message,
    data: {
      payment: formatPayment(currentPayment),
      stripeStatus: paymentIntent.status,
      pendingWebhook,
    },
  });
}

/** Saved card payment methods for the logged-in student. */
export async function getSavedPaymentMethods(req: Request, res: Response) {
  const studentId = req.user!.id;
  const customerId = await findStripeCustomerIdForStudent(studentId);

  if (!customerId) {
    return res.status(200).json({ data: { paymentMethods: [] } });
  }

  const { data } = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  res.status(200).json({
    data: {
      paymentMethods: data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "****",
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        fingerprint: pm.card?.fingerprint ?? undefined,
      })),
    },
  });
}

// ============ ADMIN ENDPOINTS ============

/**
 * List all payments (admin only)
 */
export async function listPayments(req: Request, res: Response) {
  const {
    status,
    page = 1,
    limit = 10,
  } = req.query as unknown as ListPaymentsQuery;
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = {
    ...(status && { status }),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        bid: {
          include: {
            place: {
              include: { images: { orderBy: { order: "asc" }, take: 1 } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  res.status(200).json({
    data: {
      payments: payments.map(formatPayment),
      total,
      page,
      limit,
    },
  });
}

/**
 * Get single payment by ID (admin)
 */
export async function getPayment(req: Request, res: Response) {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new CustomError("Payment not found", 404);
  }

  res.status(200).json({
    data: {
      payment: formatPayment(payment),
    },
  });
}

/**
 * Capture payment (admin only)
 * Note: With automatic capture, payments are charged immediately.
 * This endpoint is kept for backwards compatibility but will return an error
 * since payments are no longer pre-authorized.
 */
export async function capturePayment(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = req.body as CapturePaymentInput;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new CustomError("Payment not found", 404);
  }

  // Since we now use automatic capture, payments go directly to CAPTURED status
  if (payment.status === payment_status.CAPTURED) {
    // Update admin notes if provided
    if (adminNotes) {
      const updatedPayment = await prisma.payment.update({
        where: { id },
        data: { adminNotes },
        include: {
          bid: {
            include: {
              place: {
                include: { images: { orderBy: { order: "asc" }, take: 1 } },
              },
            },
          },
        },
      });
      return res.status(200).json({
        message: "Payment already captured. Admin notes updated.",
        data: { payment: formatPayment(updatedPayment) },
      });
    }
    throw new CustomError("Payment already captured", 400);
  }

  throw new CustomError(
    `Cannot capture payment with status: ${payment.status}. Payments are now charged immediately upon confirmation.`,
    400,
  );
}

/**
 * Cancel payment (admin only)
 * This cancels pending payments before they are completed
 * Note: Once a payment is captured, it cannot be cancelled - a refund would be needed instead
 */
export async function cancelPayment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, adminNotes } = req.body as CancelPaymentInput;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bid: true,
    },
  });

  if (!payment) {
    throw new CustomError("Payment not found", 404);
  }

  if (payment.status !== payment_status.PENDING) {
    throw new CustomError(
      `Cannot cancel payment with status: ${payment.status}. Only PENDING payments can be cancelled. For captured payments, a refund is required.`,
      400,
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new CustomError("No payment intent found", 400);
  }

  // Cancel the payment intent in Stripe
  try {
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId, {
      cancellation_reason: "requested_by_customer",
    });
  } catch (error: any) {
    throw new CustomError(`Failed to cancel payment: ${error.message}`, 500);
  }

  // Update payment record
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: payment_status.CANCELLED,
      cancelledAt: new Date(),
      failureReason: reason,
      adminNotes: adminNotes || payment.adminNotes,
    },
    include: {
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  // Also update the bid status to REJECTED if admin is cancelling
  await prisma.bid.update({
    where: { id: payment.bidId },
    data: {
      status: bid_status.REJECTED,
      rejectionReason: reason || "Payment cancelled by admin",
    },
  });

  res.status(200).json({
    message: "Payment cancelled.",
    data: {
      payment: formatPayment(updatedPayment),
    },
  });
}
