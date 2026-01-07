# Bid System

## Overview

The bid system allows students to place offers on available accommodations. Bids can be manually reviewed by admins or auto-accepted if they meet certain criteria.

## Bid Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                        BID LIFECYCLE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Student Places Bid                                             │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────────────────────────────┐                        │
│   │  Auto-Accept Enabled for Place?     │                        │
│   │  AND Bid >= Minimum?                │                        │
│   └─────────────────────────────────────┘                        │
│          │                    │                                  │
│         Yes                   No                                 │
│          │                    │                                  │
│          ▼                    ▼                                  │
│   ┌───────────┐        ┌───────────┐                             │
│   │ ACCEPTED  │        │  PENDING  │                             │
│   └───────────┘        └───────────┘                             │
│          │                    │                                  │
│          │                    │                                  │
│          ▼                    ▼                                  │
│   ┌─────────────────────────────────────┐                        │
│   │   Can Proceed to Checkout           │                        │
│   │   (Once Accepted)                   │                        │
│   └─────────────────────────────────────┘                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Bid Status Values

| Status     | Description                        | Next Actions                              |
| ---------- | ---------------------------------- | ----------------------------------------- |
| `PENDING`  | Bid submitted, awaiting acceptance | Wait for auto-accept or system processing |
| `ACCEPTED` | Bid approved                       | Student can proceed to checkout           |

## Backend Implementation

### Validation Schema

```typescript
// backend/src/validations/bids/bids.validation.ts

import { z } from "zod";

export const createBidSchema = z.object({
  placeId: z.string().uuid(),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  bidPerNight: z.number().positive(),
});

export type CreateBidInput = z.infer<typeof createBidSchema>;
```

### Controller Functions

#### Create Bid

```typescript
// backend/src/controllers/bids.controller.ts

export async function createBid(req: Request, res: Response) {
  const data = req.body as CreateBidInput;
  const studentId = req.user!.id;

  // 1. Get the place
  const place = await prisma.place.findUnique({
    where: { id: data.placeId },
  });

  if (!place) {
    throw new CustomError("Place not found", 404);
  }

  // 2. Check if place is LIVE
  if (place.status !== PlaceStatus.LIVE) {
    throw new CustomError("This place is not available for bidding", 400);
  }

  // 3. Parse and validate dates
  const checkInDate = parseISO(data.checkInDate);
  const checkOutDate = parseISO(data.checkOutDate);

  // 4. Check for blackout dates
  const blackoutDates = place.blackoutDates || [];
  for (const blackoutDate of blackoutDates) {
    const blackout = parseISO(blackoutDate);
    if (blackout >= checkInDate && blackout < checkOutDate) {
      throw new CustomError(
        `The place is not available on ${blackoutDate}`,
        400
      );
    }
  }

  // 5. Calculate totals
  const totalNights = differenceInDays(checkOutDate, checkInDate);
  const totalAmount = data.bidPerNight * totalNights;

  // 6. Validate minimum bid
  if (data.bidPerNight < place.minimumBid) {
    throw new CustomError(
      `Your bid must be at least $${place.minimumBid} per night`,
      400
    );
  }

  // 7. Check for existing pending bid
  const existingBid = await prisma.bid.findFirst({
    where: {
      placeId: data.placeId,
      studentId,
      status: "PENDING",
      checkInDate: { lte: checkOutDate },
      checkOutDate: { gte: checkInDate },
    },
  });

  if (existingBid) {
    throw new CustomError(
      "You already have a pending bid for overlapping dates",
      400
    );
  }

  // 8. Determine status (auto-accept check)
  let status: bid_status = bid_status.PENDING;
  let message = "Your bid has been submitted and is pending review.";

  if (place.autoAcceptAboveMinimum && data.bidPerNight >= place.minimumBid) {
    status = bid_status.ACCEPTED;
    message = "Congratulations! Your bid has been automatically accepted.";
  }

  // 9. Create the bid
  const bid = await prisma.bid.create({
    data: {
      placeId: data.placeId,
      studentId,
      checkInDate,
      checkOutDate,
      bidPerNight: data.bidPerNight,
      totalNights,
      totalAmount,
      status,
    },
    include: {
      place: {
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
    },
  });

  res.status(201).json({
    message,
    bid: formatBid(bid),
    status,
  });
}
```

#### Get Student's Bids

```typescript
export async function getMyBids(req: Request, res: Response) {
  const studentId = req.user!.id;
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const where = {
    studentId,
    ...(status && { status }),
  };

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where,
      include: {
        place: {
          include: { images: { orderBy: { order: "asc" }, take: 1 } },
        },
        payment: true, // Include payment status
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where }),
  ]);

  res.status(200).json({
    bids: bids.map(formatBid),
    total,
    page,
    limit,
  });
}
```

### API Routes

```typescript
// backend/src/routers/bids.router.ts

import { Router } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { validate } from "../libs/middlewares/validate";
import { UserRole } from "../types/auth.types";
import * as bidsController from "../controllers/bids.controller";
import * as validation from "../validations/bids/bids.validation";

const router = Router();

// Student routes
router.post(
  "/",
  authenticate(UserRole.STUDENT),
  validate(validation.createBidSchema),
  bidsController.createBid
);

router.get("/my", authenticate(UserRole.STUDENT), bidsController.getMyBids);

router.get(
  "/place/:placeId",
  authenticate(UserRole.STUDENT),
  bidsController.getBidForPlace
);

// Admin routes
router.get("/", authenticate(UserRole.ADMIN), bidsController.listBids);

router.patch(
  "/:id/status",
  authenticate(UserRole.ADMIN),
  validate(validation.updateBidStatusSchema),
  bidsController.updateBidStatus
);

export { router };
```

## Frontend Implementation

### Types

```typescript
// frontend/src/types/bid.types.ts

export enum BidStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export interface BidPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  authorizedAt?: string;
  capturedAt?: string;
}

export interface Bid {
  id: string;
  placeId: string;
  studentId: string;
  checkInDate: string;
  checkOutDate: string;
  bidPerNight: number;
  totalNights: number;
  totalAmount: number;
  status: BidStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  place?: BidPlace;
  payment?: BidPayment; // Payment info included
}
```

### Hooks

```typescript
// frontend/src/hooks/useBids.ts

// Check if student has existing bid for a place
export const useBidForPlace = (placeId: string) => {
  return useApiQuery<BidDetailResponse | null>({
    queryKey: ["bids", "place", placeId],
    endpoint: getEndpoint(ENDPOINTS.BID_FOR_PLACE, { placeId }),
    enabled: !!placeId,
  });
};

// Get student's own bids
export const useMyBids = (params?: { status?: BidStatus }) => {
  return useApiQuery<MyBidsResponse>({
    queryKey: ["bids", "my", params],
    endpoint: ENDPOINTS.BIDS_MY,
    params,
  });
};

// Create a new bid
export const useCreateBid = () => {
  const queryClient = useQueryClient();

  return useApiMutation<BidResponse, CreateBidRequest>({
    endpoint: ENDPOINTS.BIDS_CREATE,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};
```

### BidForm Component

The `BidForm` component handles:

1. Date selection with blackout date validation
2. Bid amount input with minimum validation
3. Total calculation
4. Submission with loading states
5. Result display (accepted/pending/rejected)
6. Checkout redirect for accepted bids

Key features:

- Shows existing bid if student already bid on this place
- Displays payment status badge
- Redirects to checkout page for accepted bids

```typescript
// Determining if checkout is available
const canCheckout =
  bid.status === BidStatus.ACCEPTED &&
  (!payment ||
    paymentStatus === "PENDING" ||
    paymentStatus === "FAILED" ||
    paymentStatus === "EXPIRED");
```

## Auto-Accept Feature

Places can be configured to automatically accept bids that meet the minimum:

```typescript
// In place creation/edit
{
  autoAcceptAboveMinimum: true,
  minimumBid: 50.00
}
```

When `autoAcceptAboveMinimum` is `true`, any bid at or above `minimumBid` will be automatically accepted, skipping the pending review state.

## Business Rules

1. **One pending bid per date range**: Students cannot have overlapping pending bids for the same place
2. **Minimum bid enforcement**: Bids below minimum are rejected
3. **Date restrictions**: Bids only allowed for dates within the next 30 days
4. **Blackout dates**: Bids cannot include blackout dates
5. **Place status**: Only LIVE places accept bids
