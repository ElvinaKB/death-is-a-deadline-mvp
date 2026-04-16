# Payment System

## Overview

The payment system uses Stripe's **automatic capture** flow. When a student's bid is accepted and they proceed to checkout, entering their card details immediately charges the card for the full amount.

## Why Direct Charge?

Direct charging is used because:

1. **Immediate settlement**: Payment is finalized upon confirmation, reducing chargeback risk
2. **Simplicity**: No need for admin capture step, streamlined flow
3. **Clear confirmation**: Students receive immediate payment confirmation
4. **Reduced operational overhead**: No pending payment management needed

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
│   │  (capture_method: 'automatic')          │                    │
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
│   │  Card is CHARGED                        │                    │
│   └─────────────────────────────────────────┘                    │
│        │                                                          │
│        ├──────────────┬──────────────┐                           │
│        │              │              │                            │
│        ▼              ▼              ▼                            │
│    SUCCEEDED      REQUIRES_ACTION    FAILED                       │
│    (Payment       (3D Secure,      (Declined,                    │
│     Complete)     etc)             Insufficient, etc)             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Payment Status Values

| Status            | Description                      | Card State | Next Actions    |
| ----------------- | -------------------------------- | ---------- | --------------- |
| `PENDING`         | PaymentIntent created, awaiting card | No charge  | Enter card      |
| `REQUIRES_ACTION` | 3D Secure or other auth required | No charge  | Complete auth   |
| `SUCCEEDED`       | Payment complete, funds charged  | Charged    | None (final)    |
| `FAILED`          | Payment failed (declined, etc)   | No charge  | Retry           |

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
    capture_method: "automatic", // ← KEY: Direct charge
    metadata: {
      bid_id: bid.id,
      student_id: studentId,
      place_id: bid.placeId,
    },
    description: `Bid for ${bid.place.name} - ${bid.totalNights} nights`,
  });

  // 4. Create/update payment record
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
  if (paymentIntent.status === "succeeded") {
    // Payment charged successfully
    updateData.status = payment_status.SUCCEEDED;
    updateData.capturedAt = new Date();
  } else if (paymentIntent.status === "requires_action") {
    updateData.status = payment_status.REQUIRES_ACTION;
  } else if (paymentIntent.status === "requires_payment_method") {
    updateData.status = payment_status.FAILED;
    updateData.failedAt = new Date();
    updateData.failureReason = "Payment method required";
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: updateData,
  });

  res.json({
    message:
      updateData.status === payment_status.SUCCEEDED
        ? "Payment successful. Charge complete."
        : `Payment status: ${updateData.status}`,
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

// Confirm payment after card charge
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
```

## Important Notes

### Webhook Events

The webhook handles these Stripe events:

- `payment_intent.succeeded` → SUCCEEDED
- `payment_intent.payment_failed` → FAILED

### Error Handling

- Card declined → FAILED status with `failureReason`
- 3D Secure required → REQUIRES_ACTION status
- Network errors → Retry with same PaymentIntent

### Security

- Payment records are linked to students via `studentId`
- Students can only view/confirm their own payments
- Only admins can capture/cancel payments
