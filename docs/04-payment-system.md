# Payment System

## Overview

The payment system uses Stripe's **pre-authorization** (auth and capture) flow. When a student's bid is accepted and they proceed to checkout, their card is authorized (funds held) but not charged. The admin can then capture (charge) or cancel (release) the payment.

## Why Pre-Authorization?

Pre-authorization is ideal for this use case because:

1. **Guaranteed funds**: Funds are held on the card, ensuring payment is available
2. **Flexibility**: Admin can review before finalizing the charge
3. **Risk mitigation**: Can cancel without actually charging if issues arise
4. **Standard practice**: Common in hospitality industry

## Payment Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      PAYMENT LIFECYCLE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Bid Accepted                                                    │
│        │                                                          │
│        ▼                                                          │
│   Student clicks "Proceed to Checkout"                            │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────────────────────────────────┐                    │
│   │  Backend: Create PaymentIntent          │                    │
│   │  (capture_method: 'manual')             │                    │
│   └─────────────────────────────────────────┘                    │
│        │                                                          │
│        ▼                                                          │
│   Payment Status: PENDING                                         │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────────────────────────────────┐                    │
│   │  Frontend: Stripe PaymentElement        │                    │
│   │  Student enters card details            │                    │
│   └─────────────────────────────────────────┘                    │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────────────────────────────────┐                    │
│   │  stripe.confirmPayment()                │                    │
│   │  Card is AUTHORIZED                     │                    │
│   └─────────────────────────────────────────┘                    │
│        │                                                          │
│        ▼                                                          │
│   Payment Status: AUTHORIZED                                      │
│   (Funds held on card for up to 7 days)                          │
│        │                                                          │
│        ├────────────────────────────────┐                        │
│        │                                │                         │
│        ▼                                ▼                         │
│   Admin CAPTURES              Admin CANCELS                       │
│        │                                │                         │
│        ▼                                ▼                         │
│   Payment: CAPTURED           Payment: CANCELLED                  │
│   (Card charged)              (Funds released)                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Payment Status Values

| Status            | Description                          | Card State | Next Actions         |
| ----------------- | ------------------------------------ | ---------- | -------------------- |
| `PENDING`         | PaymentIntent created, awaiting card | No hold    | Enter card           |
| `REQUIRES_ACTION` | 3D Secure or other auth required     | No hold    | Complete auth        |
| `AUTHORIZED`      | Card authorized, funds held          | Funds held | Admin capture/cancel |
| `CAPTURED`        | Payment complete, funds charged      | Charged    | None (final)         |
| `CANCELLED`       | Payment cancelled, funds released    | Released   | None (final)         |
| `FAILED`          | Payment failed                       | No hold    | Retry                |
| `EXPIRED`         | Authorization expired (7 days)       | Released   | Create new           |

## Backend Implementation

### Configuration

```typescript
// backend/src/libs/config/stripe.ts

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const STRIPE_CONFIG = {
  CURRENCY: "usd",
  AUTH_EXPIRY_DAYS: 6, // Hold funds for 6 days (Stripe max is 7)
  METADATA_KEYS: {
    BID_ID: "bid_id",
    STUDENT_ID: "student_id",
    PLACE_ID: "place_id",
    CHECK_IN_DATE: "check_in_date",
    CHECK_OUT_DATE: "check_out_date",
  },
};
```

### Create Payment Intent

```typescript
// backend/src/controllers/payments.controller.ts

export async function createPaymentIntent(req: Request, res: Response) {
  const { bidId } = req.body;
  const studentId = req.user!.id;

  // 1. Get the bid
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { place: true, payment: true },
  });

  if (!bid) throw new CustomError("Bid not found", 404);
  if (bid.studentId !== studentId) throw new CustomError("Forbidden", 403);
  if (bid.status !== bid_status.ACCEPTED) {
    throw new CustomError("Only accepted bids can be paid", 400);
  }

  // 2. Check existing payment
  if (bid.payment) {
    if (bid.payment.status === payment_status.AUTHORIZED) {
      throw new CustomError("Payment already authorized", 400);
    }
    if (bid.payment.status === payment_status.CAPTURED) {
      throw new CustomError("Payment already captured", 400);
    }
    // Return existing pending payment
    if (bid.payment.status === payment_status.PENDING) {
      return res.json({
        payment: formatPayment(bid.payment),
        clientSecret: bid.payment.stripeClientSecret,
      });
    }
  }

  // 3. Create Stripe PaymentIntent
  const amountInCents = Math.round(Number(bid.totalAmount) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: STRIPE_CONFIG.CURRENCY,
    capture_method: "manual", // ← KEY: Pre-authorization
    metadata: {
      bid_id: bid.id,
      student_id: studentId,
      place_id: bid.placeId,
    },
    description: `Bid for ${bid.place.name} - ${bid.totalNights} nights`,
  });

  // 4. Create/update payment record
  const expiresAt = addDays(new Date(), STRIPE_CONFIG.AUTH_EXPIRY_DAYS);

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
    },
  });

  res.status(201).json({
    payment: formatPayment(payment),
    clientSecret: paymentIntent.client_secret,
  });
}
```

### Confirm Payment Status

After frontend confirms the payment, update our database:

```typescript
export async function confirmPaymentStatus(req: Request, res: Response) {
  const { id } = req.params;
  const studentId = req.user!.id;

  const payment = await prisma.payment.findUnique({
    where: { id },
  });

  if (!payment) throw new CustomError("Payment not found", 404);
  if (payment.studentId !== studentId) throw new CustomError("Forbidden", 403);

  // Get latest status from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.stripePaymentIntentId!
  );

  let updateData: Prisma.PaymentUpdateInput = {
    stripePaymentMethodId: paymentIntent.payment_method as string,
  };

  // Map Stripe status to our status
  if (paymentIntent.status === "requires_capture") {
    // Funds are held (pre-authorization successful)
    updateData.status = payment_status.AUTHORIZED;
    updateData.authorizedAt = new Date();
  } else if (paymentIntent.status === "requires_action") {
    updateData.status = payment_status.REQUIRES_ACTION;
  } else if (paymentIntent.status === "requires_payment_method") {
    updateData.status = payment_status.FAILED;
    updateData.failedAt = new Date();
    updateData.failureReason = "Payment method required";
  } else if (paymentIntent.status === "canceled") {
    updateData.status = payment_status.CANCELLED;
    updateData.cancelledAt = new Date();
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: updateData,
  });

  res.json({
    message:
      updateData.status === payment_status.AUTHORIZED
        ? "Payment authorized. Funds are held."
        : `Payment status: ${updateData.status}`,
    payment: formatPayment(updatedPayment),
  });
}
```

### Capture Payment (Admin)

```typescript
export async function capturePayment(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const payment = await prisma.payment.findUnique({ where: { id } });

  if (!payment) throw new CustomError("Payment not found", 404);
  if (payment.status !== payment_status.AUTHORIZED) {
    throw new CustomError("Can only capture AUTHORIZED payments", 400);
  }

  // Capture in Stripe (actually charges the card)
  await stripe.paymentIntents.capture(payment.stripePaymentIntentId!);

  // Update our record
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: payment_status.CAPTURED,
      capturedAt: new Date(),
      adminNotes,
    },
  });

  res.json({
    message: "Payment captured. Funds have been charged.",
    payment: formatPayment(updatedPayment),
  });
}
```

### Cancel Payment (Admin)

```typescript
export async function cancelPayment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, adminNotes } = req.body;

  const payment = await prisma.payment.findUnique({ where: { id } });

  if (!payment) throw new CustomError("Payment not found", 404);
  if (!["AUTHORIZED", "PENDING"].includes(payment.status)) {
    throw new CustomError(
      "Can only cancel PENDING or AUTHORIZED payments",
      400
    );
  }

  // Cancel in Stripe (releases the hold)
  await stripe.paymentIntents.cancel(payment.stripePaymentIntentId!, {
    cancellation_reason: "requested_by_customer",
  });

  // Update our record
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: payment_status.CANCELLED,
      cancelledAt: new Date(),
      failureReason: reason,
      adminNotes,
    },
  });

  // Also reject the bid
  await prisma.bid.update({
    where: { id: payment.bidId },
    data: {
      status: bid_status.REJECTED,
      rejectionReason: reason || "Payment cancelled by admin",
    },
  });

  res.json({
    message: "Payment cancelled. Held funds have been released.",
    payment: formatPayment(updatedPayment),
  });
}
```

## API Routes

```typescript
// backend/src/routers/payments.router.ts

const router = Router();

// Webhook (raw body required - configured in app.ts)
router.post("/webhook", handlePaymentWebhook);

// Student routes
router.post(
  "/create-intent",
  authenticate(UserRole.STUDENT),
  validate(createPaymentIntentSchema),
  createPaymentIntent
);

router.get("/bid/:bidId", authenticate(UserRole.STUDENT), getPaymentForBid);

router.post(
  "/:id/confirm",
  authenticate(UserRole.STUDENT),
  confirmPaymentStatus
);

// Admin routes
router.get("/", authenticate(UserRole.ADMIN), listPayments);
router.get("/:id", authenticate(UserRole.ADMIN), getPayment);
router.post("/:id/capture", authenticate(UserRole.ADMIN), capturePayment);
router.post("/:id/cancel", authenticate(UserRole.ADMIN), cancelPayment);
```

## Frontend Implementation

### Hooks

```typescript
// frontend/src/hooks/usePayments.ts

// Create payment intent for a bid
export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PaymentResponse, { bidId: string }>({
    endpoint: ENDPOINTS.PAYMENT_CREATE_INTENT,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};

// Confirm payment after card authorization
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PaymentResponse, { id: string }>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_CONFIRM, { id: vars.id }),
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};

// Admin: Capture payment
export const useCapturePayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_CAPTURE, { id: vars.id }),
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};

// Admin: Cancel payment
export const useCancelPayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_CANCEL, { id: vars.id }),
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};
```

## Important Notes

### Authorization Hold Duration

- Stripe holds funds for up to **7 days**
- We set `expiresAt` to 6 days to give buffer time
- After expiry, you must create a new PaymentIntent

### Webhook Events

The webhook handles these Stripe events:

- `payment_intent.amount_capturable_updated` → AUTHORIZED
- `payment_intent.payment_failed` → FAILED
- `payment_intent.canceled` → CANCELLED
- `payment_intent.succeeded` → CAPTURED

### Error Handling

- Card declined → FAILED status with `failureReason`
- 3D Secure required → REQUIRES_ACTION status
- Network errors → Retry with same PaymentIntent

### Security

- Payment records are linked to students via `studentId`
- Students can only view/confirm their own payments
- Only admins can capture/cancel payments
