import { payment_status, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "../libs/config/prisma";
import { supabase } from "../libs/config/supabase";
import { STRIPE_CONFIG } from "../libs/config/stripe";
import { sendBookingConfirmationEmails } from "./bookingConfirmationEmail.service";
import { notifyBookingConfirmed } from "./myallocatorNotify.service";

const HANDLED_EVENT_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

export async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  const { count } = await prisma.stripeEvent.createMany({
    data: [{ id: event.id, type: event.type }],
    skipDuplicates: true,
  });
  return count > 0;
}

export async function releaseStripeEvent(eventId: string): Promise<void> {
  await prisma.stripeEvent
    .deleteMany({ where: { id: eventId } })
    .catch(() => undefined);
}

function getPaymentIntentId(event: Stripe.Event): string | null {
  const obj = event.data.object;
  if (obj && typeof obj === "object" && "id" in obj && typeof obj.id === "string") {
    return obj.id;
  }
  return null;
}

function getPaymentIntent(event: Stripe.Event): Stripe.PaymentIntent | null {
  if (event.data.object?.object === "payment_intent") {
    return event.data.object as Stripe.PaymentIntent;
  }
  return null;
}

function resolvePaymentMethodId(
  paymentIntent: Stripe.PaymentIntent,
  existing: string | null,
): string | null {
  if (typeof paymentIntent.payment_method === "string") {
    return paymentIntent.payment_method;
  }
  if (
    paymentIntent.payment_method &&
    typeof paymentIntent.payment_method === "object"
  ) {
    return paymentIntent.payment_method.id;
  }
  return existing;
}

async function applyBidCommission(
  bidId: string,
  totalAmount: number,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const platformCommission =
    Math.round(totalAmount * STRIPE_CONFIG.PLATFORM_COMMISSION_RATE * 100) / 100;
  const payableToHotel =
    Math.round((totalAmount - platformCommission) * 100) / 100;

  await tx.bid.update({
    where: { id: bidId },
    data: { platformCommission, payableToHotel },
  });
}

interface PaymentSucceededResult {
  paymentId: string;
  studentId: string;
  referralCreditAppliedCents: number;
  bidId: string | null;
  // Place slug = the OTA property id for the myallocator NotifyBooking callback.
  otaPropertyId: string | null;
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  tx: Prisma.TransactionClient,
): Promise<PaymentSucceededResult | null> {
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { bid: true },
  });

  if (!payment) {
    console.warn(
      `[stripe-webhook] No payment row for succeeded intent ${paymentIntent.id}`,
    );
    return null;
  }

  if (payment.status === payment_status.CAPTURED) {
    return null;
  }

  const succeededPayment = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: payment_status.CAPTURED,
      capturedAt: new Date(),
      stripePaymentMethodId: resolvePaymentMethodId(
        paymentIntent,
        payment.stripePaymentMethodId,
      ),
      stripeCustomerId:
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.toString() ?? payment.stripeCustomerId,
    },
    include: { bid: { include: { place: { select: { slug: true } } } } },
  });

  if (succeededPayment.bid) {
    await applyBidCommission(
      succeededPayment.bidId,
      Number(succeededPayment.bid.totalAmount),
      tx,
    );
  }

  const metadata = (succeededPayment.metadata ?? {}) as Record<string, any>;
  const referralCreditAppliedCents = Number(metadata.referralCreditAppliedCents) || 0;

  return {
    paymentId: succeededPayment.id,
    studentId: succeededPayment.studentId,
    referralCreditAppliedCents,
    bidId: succeededPayment.bidId ?? null,
    otaPropertyId: succeededPayment.bid?.place?.slug ?? null,
  };
}

/** Only actually deducts the traveler's stored credit once a charge has
 * genuinely captured — reserved-but-unused credit (failed/canceled
 * payments) is never touched here. */
async function deductReferralCredit(
  studentId: string,
  creditAppliedCents: number,
): Promise<void> {
  if (creditAppliedCents <= 0) return;

  const { data, error } = await supabase.auth.admin.getUserById(studentId);
  if (error || !data.user) {
    console.error(
      `[stripe-webhook] Failed to load user ${studentId} to deduct referral credit:`,
      error,
    );
    return;
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, any>;
  const currentCredit = Number(meta.referralCredit) || 0;
  const newCredit = Math.max(0, currentCredit - creditAppliedCents / 100);

  const { error: updateError } = await supabase.auth.admin.updateUserById(studentId, {
    user_metadata: { ...meta, referralCredit: newCredit },
  });
  if (updateError) {
    console.error(
      `[stripe-webhook] Failed to deduct referral credit for ${studentId}:`,
      updateError,
    );
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!payment) {
    console.warn(
      `[stripe-webhook] No payment row for failed intent ${paymentIntent.id}`,
    );
    return;
  }

  if (payment.status === payment_status.FAILED) {
    return;
  }

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: payment_status.FAILED,
      failedAt: new Date(),
      failureReason:
        paymentIntent.last_payment_error?.message || "Payment failed",
    },
  });
}

async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!payment) {
    console.warn(
      `[stripe-webhook] No payment row for canceled intent ${paymentIntent.id}`,
    );
    return;
  }

  if (payment.status === payment_status.CANCELLED) {
    return;
  }

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: payment_status.CANCELLED,
      cancelledAt: new Date(),
    },
  });
}

/** Sole writer for payment status, commission, and booking emails (PR 3). */
export async function processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    console.log(`[stripe-webhook] Ignoring unhandled event type: ${event.type}`);
    return;
  }

  const paymentIntent = getPaymentIntent(event);
  const paymentIntentId = paymentIntent?.id ?? getPaymentIntentId(event);

  if (!paymentIntentId) {
    console.warn(
      `[stripe-webhook] Missing payment_intent id on event ${event.id} (${event.type})`,
    );
    return;
  }

  const intent =
    paymentIntent ?? ({ id: paymentIntentId } as Stripe.PaymentIntent);

  const succeededResult = await prisma.$transaction(
    async (tx): Promise<PaymentSucceededResult | null> => {
      switch (event.type) {
        case "payment_intent.succeeded":
          return handlePaymentIntentSucceeded(intent, tx);
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(intent, tx);
          return null;
        case "payment_intent.canceled":
          await handlePaymentIntentCanceled(intent, tx);
          return null;
        default:
          return null;
      }
    },
  );

  if (succeededResult) {
    await sendBookingConfirmationEmails(succeededResult.paymentId);
    await deductReferralCredit(
      succeededResult.studentId,
      succeededResult.referralCreditAppliedCents,
    );
    // Prompt Cloudbeds to import this booking now so the hotel's availability
    // drops everywhere. Fire-and-forget, fails open if not credentialed.
    if (succeededResult.bidId && succeededResult.otaPropertyId) {
      notifyBookingConfirmed(
        succeededResult.bidId,
        succeededResult.otaPropertyId,
      ).catch((error) =>
        console.error("[stripe-webhook] notifyBookingConfirmed failed:", error),
      );
    }
  }
}
