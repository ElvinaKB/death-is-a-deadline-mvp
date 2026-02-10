import { bid_status, payment_status, Prisma } from "@prisma/client";
import { format, eachDayOfInterval } from "date-fns";
import { Request, Response } from "express";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import { prisma } from "../libs/config/prisma";
import { stripe, STRIPE_CONFIG } from "../libs/config/stripe";
import { CustomError } from "../libs/utils/CustomError";
import {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentIntentInput,
  ListPaymentsQuery,
} from "../validations/payments/payments.validation";

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

  // Create Stripe PaymentIntent with automatic capture (immediate charge)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: STRIPE_CONFIG.CURRENCY,
    capture_method: "automatic", // Charge immediately when payment is confirmed
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
      status: payment_status.PENDING,
    },
    update: {
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
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
      400,
    );
  }

  const paymentIntent = event.data.object as any;

  switch (event.type) {
    case "payment_intent.succeeded":
      // Payment succeeded - funds have been charged
      const succeededPayment = await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.CAPTURED,
          capturedAt: new Date(),
          stripePaymentMethodId: paymentIntent.payment_method,
        },
        include: { bid: true },
      });

      // Calculate and save commission when payment is captured
      if (succeededPayment.bid) {
        const totalAmount = Number(succeededPayment.bid.totalAmount);
        const platformCommission =
          Math.round(
            totalAmount * STRIPE_CONFIG.PLATFORM_COMMISSION_RATE * 100,
          ) / 100;
        const payableToHotel =
          Math.round((totalAmount - platformCommission) * 100) / 100;

        await prisma.bid.update({
          where: { id: succeededPayment.bidId },
          data: {
            platformCommission,
            payableToHotel,
          },
        });
      }
      console.log("Payment status updated to: CAPTURED");
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
      console.log("Payment status updated to: FAILED");
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
      console.log("Payment status updated to: CANCELLED");
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
      student: true,
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
    payment.stripePaymentIntentId,
  );

  let newStatus: payment_status = payment.status;
  const updateData: Prisma.PaymentUpdateInput = {
    stripePaymentMethodId: paymentIntent.payment_method as string,
  };

  if (paymentIntent.status === "succeeded") {
    // Payment succeeded - funds have been charged
    newStatus = payment_status.CAPTURED;
    updateData.status = payment_status.CAPTURED;
    updateData.capturedAt = new Date();

    // Calculate and save commission when payment is captured
    const totalAmount = Number(payment.bid.totalAmount);
    const platformCommission =
      Math.round(totalAmount * STRIPE_CONFIG.PLATFORM_COMMISSION_RATE * 100) /
      100;
    const payableToHotel =
      Math.round((totalAmount - platformCommission) * 100) / 100;

    // Update bid with commission fields
    await prisma.bid.update({
      where: { id: payment.bidId },
      data: {
        platformCommission,
        payableToHotel,
      },
    });
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
      student: true,
      bid: {
        include: {
          place: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
    },
  });

  // Send confirmation emails if payment was captured
  if (newStatus === payment_status.CAPTURED && updatedPayment.bid) {
    const bid = updatedPayment.bid;
    const place = bid.place as typeof bid.place & { email?: string | null };
    const student = updatedPayment.student;

    const emailVariables = {
      studentName:
        (student.raw_user_meta_data as any)?.name || student.email || "Student",
      studentEmail: student.email || "",
      placeName: place.name,
      placeCity: place.city,
      placeCountry: place.country,
      checkInDate: format(new Date(bid.checkInDate), "MMMM d, yyyy"),
      checkOutDate: format(new Date(bid.checkOutDate), "MMMM d, yyyy"),
      totalNights: bid.totalNights,
      bidPerNight: Number(bid.bidPerNight).toFixed(2),
      totalAmount: Number(bid.totalAmount).toFixed(2),
      appName: process.env.EMAIL_NAME || "Education Bidding",
      dashboardUrl: `${process.env.CLIENT_URL}/student/my-bids`,
    };

    // Send email to student
    if (student.email) {
      try {
        await sendEmail({
          type: EmailType.BOOKING_CONFIRMED_STUDENT,
          to: student.email,
          subject: `Booking Confirmed - ${place.name}`,
          variables: emailVariables,
        });
      } catch (error) {
        console.error("Failed to send student confirmation email:", error);
      }
    }

    // Send email to place if email is configured
    if (place.email) {
      try {
        await sendEmail({
          type: EmailType.BOOKING_CONFIRMED_PLACE,
          to: place.email,
          subject: `New Booking - ${place.name}`,
          variables: emailVariables,
        });
      } catch (error) {
        console.error("Failed to send place confirmation email:", error);
      }
    }
  }

  res.status(200).json({
    message:
      newStatus === payment_status.CAPTURED
        ? "Payment successful. Your booking is confirmed."
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
