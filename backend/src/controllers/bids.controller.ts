import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { PlaceStatus, Prisma, bid_status } from "@prisma/client";
import { differenceInDays, parseISO } from "date-fns";
import {
  CreateBidInput,
  UpdateBidStatusInput,
  ListBidsQuery,
  MyBidsQuery,
} from "../validations/bids/bids.validation";

// Helper to format bid response
const formatBid = (bid: any) => ({
  id: bid.id,
  placeId: bid.placeId,
  studentId: bid.studentId,
  checkInDate: bid.checkInDate,
  checkOutDate: bid.checkOutDate,
  bidPerNight: Number(bid.bidPerNight),
  totalNights: bid.totalNights,
  totalAmount: Number(bid.totalAmount),
  status: bid.status,
  rejectionReason: bid.rejectionReason,
  createdAt: bid.createdAt,
  updatedAt: bid.updatedAt,
  place: bid.place
    ? {
        id: bid.place.id,
        name: bid.place.name,
        city: bid.place.city,
        country: bid.place.country,
        images: bid.place.images || [],
      }
    : undefined,
  payment: bid.payment
    ? {
        id: bid.payment.id,
        status: bid.payment.status,
        amount: Number(bid.payment.amount),
        currency: bid.payment.currency,
        authorizedAt: bid.payment.authorizedAt,
        capturedAt: bid.payment.capturedAt,
        cancelledAt: bid.payment.cancelledAt,
        failedAt: bid.payment.failedAt,
        expiresAt: bid.payment.expiresAt,
      }
    : undefined,
});

// Create a new bid (student only)
export async function createBid(req: Request, res: Response) {
  const data = req.body as CreateBidInput;
  const studentId = req.user!.id;

  // Get the place
  const place = await prisma.place.findUnique({
    where: { id: data.placeId },
  });

  if (!place) {
    throw new CustomError("Place not found", 404);
  }

  // Check if place is LIVE
  if (place.status !== PlaceStatus.LIVE) {
    throw new CustomError("This place is not available for bidding", 400);
  }

  // Parse dates
  const checkInDate = parseISO(data.checkInDate);
  const checkOutDate = parseISO(data.checkOutDate);

  // Check for blackout dates
  const blackoutDates = place.blackoutDates || [];
  for (const blackoutDate of blackoutDates) {
    const blackout = parseISO(blackoutDate);
    if (blackout >= checkInDate && blackout < checkOutDate) {
      throw new CustomError(
        `The place is not available on ${blackoutDate}. Please choose different dates.`,
        400
      );
    }
  }

  // Calculate total nights and amount
  const totalNights = differenceInDays(checkOutDate, checkInDate);
  const totalAmount = data.bidPerNight * totalNights;

  // Check if bid meets minimum
  if (data.bidPerNight < place.minimumBid) {
    throw new CustomError(
      `Your bid must be at least $${place.minimumBid} per night`,
      400
    );
  }

  // Check for existing pending bid with overlapping dates
  const existingBid = await prisma.bid.findFirst({
    where: {
      placeId: data.placeId,
      studentId,
      status: "PENDING",
      OR: [
        {
          // New dates overlap with existing dates
          checkInDate: { lte: checkOutDate },
          checkOutDate: { gte: checkInDate },
        },
      ],
    },
  });

  if (existingBid) {
    throw new CustomError(
      "You already have a pending bid for this place with overlapping dates",
      400
    );
  }

  // Determine initial status based on auto-accept rules
  let status: bid_status = bid_status.PENDING;
  let message = "Your bid has been submitted and is pending review.";

  if (place.autoAcceptAboveMinimum && data.bidPerNight >= place.minimumBid) {
    status = bid_status.ACCEPTED;
    message = "Congratulations! Your bid has been automatically accepted.";
  }

  // Create the bid
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
    data: {
      bid: formatBid(bid),
      status,
    },
  });
}

// Get student's existing bid for a specific place
export async function getBidForPlace(req: Request, res: Response) {
  const studentId = req.user!.id;
  const { placeId } = req.params;

  const bid = await prisma.bid.findFirst({
    where: {
      studentId,
      placeId,
    },
    include: {
      place: {
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!bid) {
    res.status(200).json({ bid: null });
    return;
  }

  res.status(200).json({
    data: {
      bid: formatBid(bid),
    },
  });
}

// Get student's own bids
export async function getMyBids(req: Request, res: Response) {
  const studentId = req.user!.id;
  const { status, page = 1, limit = 10 } = req.query as unknown as MyBidsQuery;
  const skip = (page - 1) * limit;

  const where: Prisma.BidWhereInput = {
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
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where }),
  ]);

  res.status(200).json({
    data: {
      bids: bids.map(formatBid),
      total,
      page,
      limit,
    },
  });
}

// Get single bid by ID (student can only view their own)
export async function getBid(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role || req.user!.user_metadata?.role;

  const bid = await prisma.bid.findUnique({
    where: { id },
    include: {
      place: {
        include: { images: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!bid) {
    throw new CustomError("Bid not found", 404);
  }

  // Students can only view their own bids
  if (userRole === "STUDENT" && bid.studentId !== userId) {
    throw new CustomError("You can only view your own bids", 403);
  }

  res.status(200).json({
    data: {
      bid: formatBid(bid),
    },
  });
}

// List all bids (admin only)
export async function listBids(req: Request, res: Response) {
  const {
    status,
    placeId,
    page = 1,
    limit = 10,
  } = req.query as unknown as ListBidsQuery;
  const skip = (page - 1) * limit;

  const where: Prisma.BidWhereInput = {
    ...(status && { status }),
    ...(placeId && { placeId }),
  };

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where,
      include: {
        place: {
          include: { images: { orderBy: { order: "asc" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where }),
  ]);

  res.status(200).json({
    data: {
      bids: bids.map(formatBid),
      total,
      page,
      limit,
    },
  });
}

// Update bid status (admin only)
export async function updateBidStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, rejectionReason } = req.body as UpdateBidStatusInput;

  const existingBid = await prisma.bid.findUnique({ where: { id } });
  if (!existingBid) {
    throw new CustomError("Bid not found", 404);
  }

  // Can only update PENDING bids
  if (existingBid.status !== bid_status.PENDING) {
    throw new CustomError("Can only update pending bids", 400);
  }

  const bid = await prisma.bid.update({
    where: { id },
    data: {
      status,
      ...(status === "REJECTED" && rejectionReason && { rejectionReason }),
    },
    include: {
      place: {
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
    },
  });

  res.status(200).json({
    data: {
      message: `Bid ${status.toLowerCase()} successfully`,
      bid: formatBid(bid),
    },
  });
}
