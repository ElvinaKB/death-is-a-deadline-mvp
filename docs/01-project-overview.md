# Project Overview

## Introduction

Death is a Deadline is a student accommodation bidding platform where students can bid on available accommodations (places) at prices they're willing to pay. The platform uses a pre-authorization payment system where funds are held on the student's card when their bid is accepted, but only charged after admin confirmation.

## Key Features

### For Students

- Browse available accommodations
- Place bids with custom pricing
- Secure payment with card pre-authorization
- View bid status and payment status

### For Admins

- Manage places (CRUD operations)
- Review and accept/reject bids
- Capture or cancel authorized payments
- View all payments and their statuses

## Milestone 2 Scope

This implementation covers Milestone 2 which includes:

- ✅ PodShare (single hotel/place provider)
- ✅ Stripe pre-authorization flow
- ✅ Manual payment capture by admin
- ❌ No hotel onboarding (Milestone 3)
- ❌ No automated payouts (Milestone 4)

## Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth + JWT
- **Payment**: Stripe API
- **Validation**: Zod

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Redux Toolkit + TanStack Query
- **UI Components**: shadcn/ui + Tailwind CSS
- **Forms**: Formik + Yup
- **Payment UI**: Stripe Elements

## User Roles

| Role        | Permissions                                         |
| ----------- | --------------------------------------------------- |
| STUDENT     | Browse places, place bids, make payments            |
| ADMIN       | Manage places, manage bids, capture/cancel payments |
| HOTEL_OWNER | (Future) Manage own properties                      |

## Core Entities

### Place

An accommodation listing with:

- Name, description, location
- Pricing (retail price, minimum bid)
- Availability (blackout dates)
- Status (DRAFT, LIVE, PAUSED, ARCHIVED)

### Bid

A student's offer for a place:

- Date range (check-in, check-out)
- Bid amount per night
- Status (PENDING, ACCEPTED, REJECTED)

### Payment

Payment record for an accepted bid:

- Stripe PaymentIntent reference
- Status (PENDING → AUTHORIZED → CAPTURED/CANCELLED)
- Amount and currency

## Application Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         STUDENT FLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Browse Places ──▶ Place Bid ──▶ Wait for Acceptance             │
│                                         │                         │
│                                         ▼                         │
│                              ┌─────────────────────┐              │
│                              │   Bid Accepted?     │              │
│                              └─────────────────────┘              │
│                                    │         │                    │
│                                   Yes        No                   │
│                                    │         │                    │
│                                    ▼         ▼                    │
│                              Checkout    View Rejection           │
│                                    │                              │
│                                    ▼                              │
│                           Enter Card Details                      │
│                                    │                              │
│                                    ▼                              │
│                         Card Pre-Authorized                       │
│                         (Funds Held)                              │
│                                    │                              │
│                                    ▼                              │
│                          Wait for Admin                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          ADMIN FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  View Payments ──▶ Select Authorized Payment                      │
│                              │                                    │
│                              ▼                                    │
│                    ┌─────────────────────┐                        │
│                    │   Capture/Cancel?   │                        │
│                    └─────────────────────┘                        │
│                         │           │                             │
│                      Capture      Cancel                          │
│                         │           │                             │
│                         ▼           ▼                             │
│                    Charge Card   Release Hold                     │
│                    (CAPTURED)    (CANCELLED)                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```
