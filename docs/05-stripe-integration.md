# Stripe Integration

## Overview

This document covers the technical integration with Stripe, including frontend and backend setup, the PaymentIntent flow, and webhook handling.

## Stripe Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           STRIPE INTEGRATION FLOW                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐             │
│  │   Frontend  │        │   Backend   │        │   Stripe    │             │
│  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘             │
│         │                      │                      │                     │
│         │  1. POST /create-intent                     │                     │
│         │  { bidId }           │                      │                     │
│         │─────────────────────▶│                      │                     │
│         │                      │                      │                     │
│         │                      │  2. paymentIntents.create()                │
│         │                      │  { capture_method: 'manual' }              │
│         │                      │─────────────────────▶│                     │
│         │                      │                      │                     │
│         │                      │  3. { clientSecret, id }                   │
│         │                      │◀─────────────────────│                     │
│         │                      │                      │                     │
│         │  4. { clientSecret } │                      │                     │
│         │◀─────────────────────│                      │                     │
│         │                      │                      │                     │
│         │  5. stripe.confirmPayment()                 │                     │
│         │  { elements, clientSecret }                 │                     │
│         │────────────────────────────────────────────▶│                     │
│         │                      │                      │                     │
│         │  6. Card Authorized (funds held)            │                     │
│         │◀────────────────────────────────────────────│                     │
│         │                      │                      │                     │
│         │                      │  7. Webhook: amount_capturable_updated     │
│         │                      │◀─────────────────────│                     │
│         │                      │                      │                     │
│         │  8. POST /confirm    │                      │                     │
│         │─────────────────────▶│                      │                     │
│         │                      │                      │                     │
│         │                      │  9. paymentIntents.retrieve()              │
│         │                      │─────────────────────▶│                     │
│         │                      │                      │                     │
│         │  10. { status: AUTHORIZED }                 │                     │
│         │◀─────────────────────│                      │                     │
│         │                      │                      │                     │
│  ═══════╪══════════════════════╪══════════════════════╪═════════════════   │
│         │     LATER: Admin Captures Payment           │                     │
│  ═══════╪══════════════════════╪══════════════════════╪═════════════════   │
│         │                      │                      │                     │
│         │                      │  11. paymentIntents.capture()              │
│         │                      │─────────────────────▶│                     │
│         │                      │                      │                     │
│         │                      │  12. { status: 'succeeded' }               │
│         │                      │◀─────────────────────│                     │
│         │                      │                      │                     │
│         │                      │  13. Webhook: payment_intent.succeeded     │
│         │                      │◀─────────────────────│                     │
│         │                      │                      │                     │
└────────────────────────────────────────────────────────────────────────────┘
```

## Backend Stripe Setup

### Installation

```bash
cd backend
npm install stripe
```

### Configuration

```typescript
// backend/src/libs/config/stripe.ts

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia", // Use latest stable API version
});

export const STRIPE_CONFIG = {
  CURRENCY: "usd",
  AUTH_EXPIRY_DAYS: 6,
  METADATA_KEYS: {
    BID_ID: "bid_id",
    STUDENT_ID: "student_id",
    PLACE_ID: "place_id",
    CHECK_IN_DATE: "check_in_date",
    CHECK_OUT_DATE: "check_out_date",
  },
};
```

### Creating a PaymentIntent

```typescript
// Key options for pre-authorization
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // Amount in cents ($50.00)
  currency: "usd",

  // CRITICAL: This enables pre-authorization
  capture_method: "manual",

  // Metadata for tracking (stored in Stripe)
  metadata: {
    bid_id: "uuid-here",
    student_id: "uuid-here",
    place_id: "uuid-here",
  },

  // Description shown in Stripe Dashboard
  description: "Bid for Cozy Apartment - 3 nights",
});

// The client_secret is used by frontend to confirm payment
const clientSecret = paymentIntent.client_secret;
```

### Capturing a PaymentIntent

```typescript
// After admin approval, capture the held funds
const capturedPaymentIntent = await stripe.paymentIntents.capture(
  "pi_xxx" // PaymentIntent ID
);

// Status will be 'succeeded' after capture
console.log(capturedPaymentIntent.status); // 'succeeded'
```

### Canceling a PaymentIntent

```typescript
// Release held funds back to customer
const canceledPaymentIntent = await stripe.paymentIntents.cancel("pi_xxx", {
  cancellation_reason: "requested_by_customer",
});

// Status will be 'canceled'
console.log(canceledPaymentIntent.status); // 'canceled'
```

## Frontend Stripe Setup

### Installation

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Stripe Initialization

```typescript
// frontend/src/lib/stripe.ts

import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is required");
}

export const stripePromise = loadStripe(stripePublishableKey);
```

### Elements Provider

Wrap your checkout component with the Elements provider:

```tsx
// frontend/src/app/pages/student/CheckoutPage.tsx

import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "../../../lib/stripe";

function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch client secret from backend
  useEffect(() => {
    createPaymentIntent.mutate(
      { bidId },
      {
        onSuccess: (data) => {
          setClientSecret(data.clientSecret);
        },
      }
    );
  }, [bidId]);

  if (!clientSecret) {
    return <Loading />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0066cc",
          },
        },
      }}
    >
      <CheckoutForm />
    </Elements>
  );
}
```

### Checkout Form Component

```tsx
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

function CheckoutForm({ paymentId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmPayment = useConfirmPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Confirm the payment with Stripe
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/student/my-bids",
      },
      redirect: "if_required", // Only redirect if 3DS required
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed");
      setIsProcessing(false);
      return;
    }

    // For pre-authorization, status is 'requires_capture'
    if (paymentIntent && paymentIntent.status === "requires_capture") {
      // Update our backend
      await confirmPayment.mutateAsync({ id: paymentId });
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {errorMessage && <div className="error">{errorMessage}</div>}

      <button type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? "Processing..." : "Authorize Payment"}
      </button>

      <p className="text-sm text-gray-500">
        Your card will be authorized but not charged until your stay is
        confirmed.
      </p>
    </form>
  );
}
```

## Webhook Handling

### Why Webhooks?

Webhooks ensure your database stays in sync with Stripe, even if:

- User closes browser during payment
- Network issues prevent confirmation callback
- 3D Secure redirects don't return properly

### Webhook Setup in app.ts

```typescript
// backend/src/app.ts

const app = express();

app.use(cors());

// CRITICAL: Stripe webhook needs raw body
// Must be BEFORE express.json()
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());
```

### Webhook Handler

```typescript
// backend/src/controllers/payments.controller.ts

export async function handlePaymentWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Webhook secret not configured");
  }

  let event;
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Handle different event types
  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      // Payment authorized (funds held)
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.AUTHORIZED,
          authorizedAt: new Date(),
          stripePaymentMethodId: paymentIntent.payment_method as string,
        },
      });
      break;

    case "payment_intent.payment_failed":
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
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      break;

    case "payment_intent.succeeded":
      // This fires after capture
      await prisma.payment.update({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: payment_status.CAPTURED,
          capturedAt: new Date(),
        },
      });
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
}
```

### Webhook Events Reference

| Event                                      | When Fired       | Our Action          |
| ------------------------------------------ | ---------------- | ------------------- |
| `payment_intent.created`                   | Intent created   | (ignored)           |
| `payment_intent.amount_capturable_updated` | Card authorized  | Set AUTHORIZED      |
| `payment_intent.payment_failed`            | Card declined    | Set FAILED          |
| `payment_intent.canceled`                  | Intent cancelled | Set CANCELLED       |
| `payment_intent.succeeded`                 | After capture    | Set CAPTURED        |
| `payment_intent.requires_action`           | 3DS needed       | Set REQUIRES_ACTION |

## Stripe PaymentIntent States

```
┌─────────────────────────────────────────────────────────────────┐
│                 PAYMENTINTENT STATUS FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────┐                                       │
│   │ requires_payment_    │                                       │
│   │    method            │◀─────────┐                            │
│   └──────────┬───────────┘          │                            │
│              │                      │ (failure)                  │
│              ▼                      │                            │
│   ┌──────────────────────┐    ┌─────┴──────────┐                │
│   │ requires_confirmation│───▶│ requires_action │                │
│   └──────────┬───────────┘    │   (3D Secure)   │                │
│              │                └────────┬────────┘                │
│              │                         │                         │
│              ▼                         ▼                         │
│   ┌──────────────────────┐                                       │
│   │   requires_capture   │ ◀──────────────────                   │
│   │  (AUTHORIZED - funds │                                       │
│   │      are held)       │                                       │
│   └──────────┬───────────┘                                       │
│              │                                                   │
│     ┌────────┴────────┐                                          │
│     │                 │                                          │
│     ▼                 ▼                                          │
│ ┌────────┐      ┌──────────┐                                     │
│ │captured│      │ canceled │                                     │
│ │(charged)│      │(released)│                                     │
│ └────────┘      └──────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Cards

Use these test card numbers in Stripe test mode:

| Card Number         | Result             |
| ------------------- | ------------------ |
| 4242 4242 4242 4242 | Success            |
| 4000 0000 0000 0002 | Declined           |
| 4000 0025 0000 3155 | Requires 3D Secure |
| 4000 0000 0000 9995 | Insufficient funds |

Use any future date for expiry and any 3-digit CVC.

## Error Handling

### Common Stripe Errors

```typescript
try {
  await stripe.paymentIntents.capture(paymentIntentId);
} catch (error) {
  if (error instanceof Stripe.errors.StripeCardError) {
    // Card was declined
    console.error("Card declined:", error.message);
  } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    // Invalid parameters
    console.error("Invalid request:", error.message);
  } else if (error instanceof Stripe.errors.StripeAPIError) {
    // Stripe API issue
    console.error("Stripe API error:", error.message);
  }
}
```

### Idempotency

For retry-safe operations, use idempotency keys:

```typescript
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: 5000,
    currency: "usd",
    capture_method: "manual",
  },
  {
    idempotencyKey: `bid_${bidId}_${Date.now()}`,
  }
);
```
