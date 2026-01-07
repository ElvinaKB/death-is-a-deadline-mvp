# Stripe Setup Guide

This guide walks you through setting up Stripe for both development and production environments.

## Prerequisites

- Stripe account (create one at https://stripe.com)
- Node.js 18+
- ngrok (for local webhook testing)

## Step 1: Get Your API Keys

### From Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top-right)
3. Go to **Developers** → **API keys**
4. Copy your keys:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend)

### Add to Environment Files

**Backend `.env`:**

```env
STRIPE_SECRET_KEY=sk_test_51ABC...
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_... # We'll get this in Step 3
```

**Frontend `.env`:**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
```

## Step 2: Install Dependencies

### Backend

```bash
cd backend
npm install stripe
```

### Frontend

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## Step 3: Set Up Webhooks

Webhooks are essential for keeping your database in sync with Stripe events.

### For Local Development (using ngrok)

1. **Install ngrok:**

   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start your backend server:**

   ```bash
   cd backend
   npm run dev
   # Server running on http://localhost:3000
   ```

3. **Start ngrok tunnel:**

   ```bash
   ngrok http 3000
   ```

   You'll see output like:

   ```
   Forwarding    https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Register webhook in Stripe Dashboard:**

   - Go to **Developers** → **Webhooks**
   - Click **+ Add endpoint**
   - URL: `https://abc123.ngrok.io/api/payments/webhook`
   - Select events:
     - `payment_intent.amount_capturable_updated`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.succeeded`
   - Click **Add endpoint**

5. **Get webhook signing secret:**
   - After creating, click on the endpoint
   - Click **Reveal** under "Signing secret"
   - Copy the `whsec_...` value
   - Add to your `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Alternative: Stripe CLI (Recommended for Development)

The Stripe CLI can forward webhooks to your local server without ngrok:

1. **Install Stripe CLI:**

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**

   ```bash
   stripe login
   ```

3. **Forward webhooks:**

   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

   You'll see:

   ```
   Ready! Your webhook signing secret is whsec_abc123...
   ```

4. **Use this secret in your `.env`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```

### For Production

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter your production URL: `https://api.yourdomain.com/api/payments/webhook`
4. Select the same events as above
5. Get the webhook signing secret and add to production environment variables

## Step 4: Configure App for Webhooks

The webhook endpoint needs the **raw request body** for signature verification. This must be configured before the JSON parser.

**backend/src/app.ts:**

```typescript
const app = express();

app.use(cors());

// IMPORTANT: Raw body for webhook BEFORE express.json()
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/payments", paymentsRouter);
// ... other routes
```

## Step 5: Test the Integration

### 1. Test Payment Flow

1. Start your backend and frontend
2. Login as a student
3. Place a bid on a LIVE place
4. If bid is accepted (or auto-accepted), click "Proceed to Checkout"
5. Use test card: `4242 4242 4242 4242`
6. Any future date, any CVC
7. Click "Authorize Payment"

### 2. Verify Webhook Receipt

Check your terminal running `stripe listen` or ngrok:

```
2024-01-01 12:00:00 --> payment_intent.amount_capturable_updated [evt_xxx]
2024-01-01 12:00:00 <-- [200] POST /api/payments/webhook
```

### 3. Verify Database Update

The payment status should be `AUTHORIZED` in your database.

### 4. Test Admin Capture

1. Login as admin
2. Go to Payments section
3. Find the authorized payment
4. Click "Capture"
5. Verify status changes to `CAPTURED`

## Step 6: Test Different Scenarios

### Test Card Numbers

| Scenario           | Card Number         | Expected Result        |
| ------------------ | ------------------- | ---------------------- |
| Successful payment | 4242 4242 4242 4242 | Authorization succeeds |
| Card declined      | 4000 0000 0000 0002 | Payment fails          |
| Requires 3D Secure | 4000 0025 0000 3155 | 3DS authentication     |
| Insufficient funds | 4000 0000 0000 9995 | Payment fails          |

### Testing 3D Secure

1. Use card `4000 0025 0000 3155`
2. You'll be redirected to a Stripe test page
3. Click "Complete" or "Fail" to test both scenarios

## Troubleshooting

### Webhook Signature Verification Failed

**Error:**

```
Webhook signature verification failed: Webhook payload must be provided as a string or a Buffer
```

**Solution:** Ensure `express.raw()` is applied to the webhook route BEFORE `express.json()`.

### Webhook Not Receiving Events

1. Check ngrok/Stripe CLI is running
2. Verify the webhook URL is correct
3. Check the events are selected in Stripe Dashboard
4. Look at webhook logs in Stripe Dashboard

### "No such payment_intent" Error

This happens when:

- Using wrong Stripe keys (test vs live)
- Payment intent was created in a different Stripe account

### Authorization Expired

Stripe authorizations expire after 7 days. If you try to capture after that:

- Create a new PaymentIntent
- Authorize the card again

## Security Best Practices

1. **Never expose secret key** - Only use publishable key in frontend
2. **Always verify webhook signatures** - Prevents fake webhook attacks
3. **Use HTTPS in production** - Required for webhooks
4. **Store sensitive data securely** - Use environment variables, not code
5. **Log payment events** - For debugging and audit trails

## Environment Variables Summary

### Backend (.env)

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env)

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Going Live Checklist

- [ ] Switch to live mode in Stripe Dashboard
- [ ] Get live API keys (pk*live*..., sk*live*...)
- [ ] Create production webhook endpoint
- [ ] Get production webhook signing secret
- [ ] Update production environment variables
- [ ] Test with real card (small amount, then refund)
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up Stripe email notifications
- [ ] Review Stripe's going live checklist
