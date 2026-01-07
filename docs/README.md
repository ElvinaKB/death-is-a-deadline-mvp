# Death is a Deadline - Documentation

This documentation covers the implementation of the bidding and payment system for the Death is a Deadline student accommodation platform.

## Table of Contents

1. [Project Overview](./01-project-overview.md)
2. [Database Schema](./02-database-schema.md)
3. [Bid System](./03-bid-system.md)
4. [Payment System](./04-payment-system.md)
5. [Stripe Integration](./05-stripe-integration.md)
6. [Stripe Setup Guide](./06-stripe-setup-guide.md)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Stripe Account (Test Mode)
- ngrok (for local webhook testing)

### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=your_supabase_connection_string
DIRECT_URL=your_supabase_direct_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Supabase     │
│  (React + Vite) │     │   (Express.js)  │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│   Stripe.js     │     │   Stripe API    │
│  (Frontend SDK) │     │  (Backend SDK)  │
└─────────────────┘     └─────────────────┘
```

## Payment Flow Summary

1. **Student places bid** → Bid created with PENDING/ACCEPTED status
2. **Bid accepted** → Student can proceed to checkout
3. **Checkout initiated** → PaymentIntent created with `capture_method: 'manual'`
4. **Card authorized** → Funds held on card (not charged)
5. **Admin captures** → Funds actually charged
6. **Or Admin cancels** → Held funds released

This is a **pre-authorization** flow where funds are held but not charged until admin confirmation.
