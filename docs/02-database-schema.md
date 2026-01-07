# Database Schema

## Overview

The application uses PostgreSQL (via Supabase) with Prisma as the ORM. The schema uses a multi-schema approach with `auth` schema for Supabase authentication and `public` schema for application data.

## Entity Relationship Diagram

```
┌─────────────────────┐
│    auth.users       │
│   (Supabase Auth)   │
├─────────────────────┤
│ id (uuid) PK        │
│ email               │
│ user_metadata       │
│   - role            │
│   - name            │
│   - status          │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│       bids          │       │       places        │
├─────────────────────┤       ├─────────────────────┤
│ id (uuid) PK        │  N:1  │ id (uuid) PK        │
│ place_id FK ────────┼──────▶│ name                │
│ student_id FK       │       │ description         │
│ check_in_date       │       │ city, country       │
│ check_out_date      │       │ retail_price        │
│ bid_per_night       │       │ minimum_bid         │
│ total_nights        │       │ status              │
│ total_amount        │       │ blackout_dates[]    │
│ status              │       │ auto_accept_above_  │
│ rejection_reason    │       │   minimum           │
│ created_at          │       │ created_at          │
│ updated_at          │       │ updated_at          │
└──────────┬──────────┘       └──────────┬──────────┘
           │                             │
           │ 1:1                         │ 1:N
           ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│      payments       │       │    place_images     │
├─────────────────────┤       ├─────────────────────┤
│ id (uuid) PK        │       │ id (uuid) PK        │
│ bid_id FK (unique)  │       │ place_id FK         │
│ student_id FK       │       │ url                 │
│ amount              │       │ alt_text            │
│ currency            │       │ order               │
│ status              │       │ created_at          │
│ stripe_payment_     │       └─────────────────────┘
│   intent_id         │
│ stripe_client_      │
│   secret            │
│ stripe_payment_     │
│   method_id         │
│ authorized_at       │
│ captured_at         │
│ cancelled_at        │
│ failed_at           │
│ expires_at          │
│ failure_reason      │
│ admin_notes         │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

## Tables

### places

Stores accommodation listings.

```sql
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    retail_price DECIMAL(10, 2) NOT NULL,
    minimum_bid DECIMAL(10, 2) NOT NULL,
    max_guests INTEGER DEFAULT 1,
    amenities TEXT[] DEFAULT '{}',
    blackout_dates TEXT[] DEFAULT '{}',
    status place_status DEFAULT 'DRAFT',
    auto_accept_above_minimum BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status Values:**

- `DRAFT` - Not visible to students
- `LIVE` - Available for bidding
- `PAUSED` - Temporarily unavailable
- `ARCHIVED` - Permanently removed

### bids

Stores student bids on places.

```sql
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    bid_per_night DECIMAL(10, 2) NOT NULL,
    total_nights INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status bid_status DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date)
);
```

**Status Values:**

- `PENDING` - Awaiting admin review
- `ACCEPTED` - Bid approved, ready for payment
- `REJECTED` - Bid declined

### payments

Stores payment records linked to bids.

```sql
CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'CAPTURED',
    'CANCELLED',
    'FAILED',
    'EXPIRED'
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status payment_status DEFAULT 'PENDING',

    -- Stripe references
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret TEXT,
    stripe_payment_method_id VARCHAR(255),

    -- Timestamps for each status
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Additional info
    failure_reason TEXT,
    admin_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_payments_bid_id ON payments(bid_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
```

**Status Values:**
| Status | Description |
|--------|-------------|
| `PENDING` | Payment intent created, awaiting card input |
| `REQUIRES_ACTION` | Additional authentication required (3D Secure) |
| `AUTHORIZED` | Card authorized, funds held |
| `CAPTURED` | Payment completed, funds charged |
| `CANCELLED` | Payment cancelled, funds released |
| `FAILED` | Payment failed |
| `EXPIRED` | Authorization expired (after 7 days) |

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["auth", "public"]
}

model User {
  id            String    @id @db.Uuid
  email         String?
  user_metadata Json?
  bids          Bid[]
  payments      Payment[]

  @@map("users")
  @@schema("auth")
}

model Place {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                  String   @db.VarChar(255)
  description           String?
  city                  String   @db.VarChar(100)
  country               String   @db.VarChar(100)
  address               String?
  latitude              Decimal? @db.Decimal(10, 8)
  longitude             Decimal? @db.Decimal(11, 8)
  retailPrice           Decimal  @map("retail_price") @db.Decimal(10, 2)
  minimumBid            Decimal  @map("minimum_bid") @db.Decimal(10, 2)
  maxGuests             Int      @default(1) @map("max_guests")
  amenities             String[] @default([])
  blackoutDates         String[] @default([]) @map("blackout_dates")
  status                PlaceStatus @default(DRAFT)
  autoAcceptAboveMinimum Boolean @default(false) @map("auto_accept_above_minimum")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at")

  images PlaceImage[]
  bids   Bid[]

  @@map("places")
  @@schema("public")
}

model Bid {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  placeId         String     @map("place_id") @db.Uuid
  studentId       String     @map("student_id") @db.Uuid
  checkInDate     DateTime   @map("check_in_date") @db.Date
  checkOutDate    DateTime   @map("check_out_date") @db.Date
  bidPerNight     Decimal    @map("bid_per_night") @db.Decimal(10, 2)
  totalNights     Int        @map("total_nights")
  totalAmount     Decimal    @map("total_amount") @db.Decimal(10, 2)
  status          bid_status @default(PENDING)
  rejectionReason String?    @map("rejection_reason")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @default(now()) @updatedAt @map("updated_at")

  place   Place    @relation(fields: [placeId], references: [id], onDelete: Cascade)
  student User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  payment Payment?

  @@map("bids")
  @@schema("public")
}

model Payment {
  id                    String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bidId                 String         @unique @map("bid_id") @db.Uuid
  studentId             String         @map("student_id") @db.Uuid
  amount                Decimal        @db.Decimal(10, 2)
  currency              String         @default("usd") @db.VarChar(3)
  status                payment_status @default(PENDING)
  stripePaymentIntentId String?        @unique @map("stripe_payment_intent_id") @db.VarChar(255)
  stripeClientSecret    String?        @map("stripe_client_secret")
  stripePaymentMethodId String?        @map("stripe_payment_method_id") @db.VarChar(255)
  authorizedAt          DateTime?      @map("authorized_at")
  capturedAt            DateTime?      @map("captured_at")
  cancelledAt           DateTime?      @map("cancelled_at")
  failedAt              DateTime?      @map("failed_at")
  expiresAt             DateTime?      @map("expires_at")
  failureReason         String?        @map("failure_reason")
  adminNotes            String?        @map("admin_notes")
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @default(now()) @updatedAt @map("updated_at")

  bid     Bid  @relation(fields: [bidId], references: [id], onDelete: Cascade)
  student User @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("payments")
  @@schema("public")
}

enum payment_status {
  PENDING
  REQUIRES_ACTION
  AUTHORIZED
  CAPTURED
  CANCELLED
  FAILED
  EXPIRED

  @@schema("public")
}

enum bid_status {
  PENDING
  ACCEPTED
  REJECTED

  @@schema("public")
}
```

## Migration

The payments table migration file:

```sql
-- supabase/migrations/011_create_payments_table.sql

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'CAPTURED',
    'CANCELLED',
    'FAILED',
    'EXPIRED'
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status payment_status DEFAULT 'PENDING',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret TEXT,
    stripe_payment_method_id VARCHAR(255),
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    failure_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payments_bid_id ON payments(bid_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view own payments"
    ON payments FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Service role full access"
    ON payments FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
```
