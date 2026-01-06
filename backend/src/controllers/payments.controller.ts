import { bid_status, payment_status, Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { stripe, STRIPE_CONFIG } from "../libs/config/stripe";
import { CustomError } from "../libs/utils/CustomError";
import {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentIntentInput,
  ListPaymentsQuery,
} from "../validations/payments/payments.validation";

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
    ? {
        id: payment.bid.id,
        placeId: payment.bid.placeId,
        checkInDate: payment.bid.checkInDate,
        checkOutDate: payment.bid.checkOutDate,
        bidPerNight: Number(payment.bid.bidPerNight),
        totalNights: payment.bid.totalNights,
        totalAmount: Number(payment.bid.totalAmount),
        status: payment.bid.status,
        place: payment.bid.place
          ? {
              id: payment.bid.place.id,
              name: payment.bid.place.name,
              city: payment.bid.place.city,
              country: payment.bid.place.country,
              images: payment.bid.place.images || [],
            }
          : undefined,
      }
    : undefined,
});

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
    throw new CustomError("Bid not found", 404);
  }

  // Verify the bid belongs to this student
  if (bid.studentId !== studentId) {
    throw new CustomError("You can only pay for your own bids", 403);
  }

  // Verify the bid is accepted
  if (bid.status !== bid_status.ACCEPTED) {
    throw new CustomError("Only accepted bids can be paid", 400);
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
        payment: formatPayment(bid.payment),
        clientSecret: bid.payment.stripeClientSecret,
      });
    }

    if (bid.payment.status === payment_status.AUTHORIZED) {
      throw new CustomError("Payment already authorized", 400);
    }

    if (bid.payment.status === payment_status.CAPTURED) {
      throw new CustomError("Payment already captured", 400);
    }
  }

  // Convert Decimal to number for Stripe (amount in cents)
  const amountInCents = Math.round(Number(bid.totalAmount) * 100);

  // Create Stripe PaymentIntent with manual capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: STRIPE_CONFIG.CURRENCY,
    capture_method: "manual", // This enables pre-authorization
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

  // Calculate expiry date (6 days from now)
  const expiresAt = addDays(new Date(), STRIPE_CONFIG.AUTH_EXPIRY_DAYS);

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
      status: payment_status.PENDING,
      expiresAt,
    },
    update: {
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      status: payment_status.PENDING,
      expiresAt,
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
    return res.status(200).json({ payment: null });
  }

  // Verify ownership
  if (payment.studentId !== studentId) {
    throw new CustomError("You can only view your own payments", 403);
  }

  res.status(200).json({
    data: {
      payment: formatPayment(payment),
    },
  });
}

/**
 * Handle Stripe webhook to update payment status
 * Called when payment is confirmed on frontend
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
      400
    );
  }

  const paymentIntent = event.data.object as any;

  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      // Payment authorized successfully (funds held)
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.AUTHORIZED,
          authorizedAt: new Date(),
          stripePaymentMethodId: paymentIntent.payment_method,
        },
      });
      break;

    case "payment_intent.payment_failed":
      // Payment failed
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.FAILED,
          failedAt: new Date(),
          failureReason:
            paymentIntent.last_payment_error?.message || "Payment failed",
        },
      });
      break;

    case "payment_intent.canceled":
      // Payment canceled
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      break;

    case "payment_intent.succeeded":
      // This happens after capture
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.CAPTURED,
          capturedAt: new Date(),
        },
      });
      break;
  }

  res.status(200).json({ received: true });
}

/**
 * Update payment status after frontend confirmation
 * Called by frontend after confirmCardPayment succeeds
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
    throw new CustomError("Payment not found", 404);
  }

  if (payment.studentId !== studentId) {
    throw new CustomError("You can only confirm your own payments", 403);
  }

  if (!payment.stripePaymentIntentId) {
    throw new CustomError("No payment intent found", 400);
  }

  // Get latest status from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.stripePaymentIntentId
  );

  let newStatus: payment_status = payment.status;
  const updateData: Prisma.PaymentUpdateInput = {
    stripePaymentMethodId: paymentIntent.payment_method as string,
  };

  if (paymentIntent.status === "requires_capture") {
    // Funds are held (pre-authorization successful)
    newStatus = payment_status.AUTHORIZED;
    updateData.status = payment_status.AUTHORIZED;
    updateData.authorizedAt = new Date();
  } else if (paymentIntent.status === "requires_action") {
    newStatus = payment_status.REQUIRES_ACTION;
    updateData.status = payment_status.REQUIRES_ACTION;
  } else if (paymentIntent.status === "requires_payment_method") {
    newStatus = payment_status.FAILED;
    updateData.status = payment_status.FAILED;
    updateData.failedAt = new Date();
    updateData.failureReason = "Payment method required";
  } else if (paymentIntent.status === "canceled") {
    newStatus = payment_status.CANCELLED;
    updateData.status = payment_status.CANCELLED;
    updateData.cancelledAt = new Date();
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: updateData,
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

  res.status(200).json({
    message:
      newStatus === payment_status.AUTHORIZED
        ? "Payment authorized successfully. Funds are held."
        : `Payment status: ${newStatus}`,
    data: { payment: formatPayment(updatedPayment) },
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
 * This actually charges the customer's card
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

  if (payment.status !== payment_status.AUTHORIZED) {
    throw new CustomError(
      `Cannot capture payment with status: ${payment.status}. Only AUTHORIZED payments can be captured.`,
      400
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new CustomError("No payment intent found", 400);
  }

  // Capture the payment in Stripe
  try {
    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
  } catch (error: any) {
    throw new CustomError(`Failed to capture payment: ${error.message}`, 500);
  }

  // Update payment record
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: "CAPTURED",
      capturedAt: new Date(),
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

  res.status(200).json({
    message: "Payment captured successfully. Funds have been charged.",
    data: {
      payment: formatPayment(updatedPayment),
    },
  });
}

/**
 * Cancel payment / release hold (admin only)
 * This releases the held funds back to the customer
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

  if (
    payment.status !== payment_status.AUTHORIZED &&
    payment.status !== payment_status.PENDING
  ) {
    throw new CustomError(
      `Cannot cancel payment with status: ${payment.status}. Only PENDING or AUTHORIZED payments can be cancelled.`,
      400
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new CustomError("No payment intent found", 400);
  }

  // Cancel the payment intent in Stripe (releases the hold)
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
    message: "Payment cancelled. Held funds have been released.",
    data: {
      payment: formatPayment(updatedPayment),
    },
  });
}
