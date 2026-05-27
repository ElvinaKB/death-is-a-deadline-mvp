import { payment_status, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "../libs/config/prisma";
import { STRIPE_CONFIG } from "../libs/config/stripe";

const HANDLED_EVENT_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

/** Returns true if this event was newly claimed; false if already processed. */
export async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  const { count } = await prisma.stripeEvent.createMany({
    data: [{ id: event.id, type: event.type }],
    skipDuplicates: true,
  });
  return count > 0;
}

/** Remove claim so Stripe retry can re-attempt after a transient failure. */
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

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { bid: true },
  });

  if (!payment) {
    console.warn(
      `[stripe-webhook] No payment row for succeeded intent ${paymentIntent.id}`,
    );
    return;
  }

  if (payment.status === payment_status.CAPTURED) {
    return;
  }

  const succeededPayment = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: payment_status.CAPTURED,
      capturedAt: new Date(),
      stripePaymentMethodId:
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.toString() ?? payment.stripePaymentMethodId,
    },
    include: { bid: true },
  });

  if (succeededPayment.bid) {
    await applyBidCommission(
      succeededPayment.bidId,
      Number(succeededPayment.bid.totalAmount),
      tx,
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

/**
 * Process a claimed Stripe event (same side effects as before PR 2, idempotent per payment row).
 */
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

  await prisma.$transaction(async (tx) => {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          paymentIntent ?? ({ id: paymentIntentId } as Stripe.PaymentIntent),
          tx,
        );
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          paymentIntent ?? ({ id: paymentIntentId } as Stripe.PaymentIntent),
          tx,
        );
        break;
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(
          paymentIntent ?? ({ id: paymentIntentId } as Stripe.PaymentIntent),
          tx,
        );
        break;
    }
  });
}
