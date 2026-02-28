import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";
import { PlaceStatus, Prisma, bid_status } from "@prisma/client";
import { differenceInDays, parseISO, format } from "date-fns";
import {
  CreateBidInput,
  UpdateBidStatusInput,
  ListBidsQuery,
  MyBidsQuery,
} from "../validations/bids/bids.validation";
import { UserRole } from "../types/auth.types";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

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
  platformCommission: bid.platformCommission
    ? Number(bid.platformCommission)
    : null,
  payableToHotel: bid.payableToHotel ? Number(bid.payableToHotel) : null,
  payoutMethod: bid.payoutMethod,
  isPaidToHotel: bid.isPaidToHotel,
  paidToHotelAt: bid.paidToHotelAt,
  payoutNotes: bid.payoutNotes,
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
        email: bid.place.email,
        images: bid.place.images || [],
      }
    : undefined,
  student: bid.users
    ? {
        id: bid.users.id,
        name: (bid.users.raw_user_meta_data as any)?.name || null,
        email: bid.users.email,
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
        stripePaymentIntentId: bid.payment.stripePaymentIntentId, // Added this line
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
        400,
      );
    }
  }

  // Calculate total nights and amount
  const totalNights = differenceInDays(checkOutDate, checkInDate);
  const totalAmount = data.bidPerNight * totalNights;

  // Check if bid meets minimum
  if (data.bidPerNight < place.minimumBid) {
    throw new CustomError(
      `Your bid is very low, try again by increasing it.`,
      400,
    );
  }

  // Check for existing pending bid with overlapping dates
  const existingBid = await prisma.bid.findFirst({
    where: {
      placeId: data.placeId,
      studentId,
      status: bid_status.PENDING,
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
      400,
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
  if (userRole === UserRole.STUDENT && bid.studentId !== userId) {
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
        payment: true,
        users: {
          select: {
            id: true,
            email: true,
            raw_user_meta_data: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where }),
  ]);

  const data = bids.map((bid: any) => ({
    ...formatBid(bid),
    student: bid.users
      ? {
          id: bid.users.id,
          name: (bid.users.raw_user_meta_data as any)?.name || "N/A",
          email: bid.users.email,
        }
      : undefined,
  }));

  res.status(200).json({
    data: {
      bids: data,
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

// Update payout status (admin only)
export async function updatePayout(req: Request, res: Response) {
  const { id } = req.params;
  const { payoutMethod, isPaidToHotel, payoutNotes } = req.body;

  const existingBid = await prisma.bid.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!existingBid) {
    throw new CustomError("Bid not found", 404);
  }

  // Can only update payout for accepted bids with authorized/captured payment
  if (existingBid.status !== bid_status.ACCEPTED) {
    throw new CustomError("Can only update payout for accepted bids", 400);
  }

  if (
    !existingBid.payment ||
    !["AUTHORIZED", "CAPTURED"].includes(existingBid.payment.status)
  ) {
    throw new CustomError(
      "Can only update payout for bids with authorized or captured payment",
      400,
    );
  }

  const updateData: any = {};

  if (payoutMethod !== undefined) {
    updateData.payoutMethod = payoutMethod;
  }

  // Track if we're newly marking as paid (for sending email)
  const isNewlyMarkedPaid = isPaidToHotel && !existingBid.isPaidToHotel;

  if (isPaidToHotel !== undefined) {
    updateData.isPaidToHotel = isPaidToHotel;
    if (isNewlyMarkedPaid) {
      // Mark as paid now
      updateData.paidToHotelAt = new Date();
    } else if (!isPaidToHotel) {
      // Clear paid timestamp if unmarking
      updateData.paidToHotelAt = null;
    }
  }

  if (payoutNotes !== undefined) {
    updateData.payoutNotes = payoutNotes;
  }

  const bid = await prisma.bid.update({
    where: { id },
    data: updateData,
    include: {
      place: {
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
      payment: true,
      users: true,
    },
  });

  // Send payout confirmation email to hotel if newly marked as paid
  if (isNewlyMarkedPaid && bid.place.email) {
    const commissionRate = 6.66;
    const totalAmount = Number(bid.totalAmount);
    const platformCommission =
      Number(bid.platformCommission) || (totalAmount * commissionRate) / 100;
    const payableToHotel =
      Number(bid.payableToHotel) || totalAmount - platformCommission;

    try {
      await sendEmail({
        type: EmailType.PAYOUT_SENT,
        to: bid.place.email,
        subject: `Payout Sent - ${bid.place.name} Booking`,
        variables: {
          placeName: bid.place.name,
          studentName:
            (bid.users?.raw_user_meta_data as any)?.name ||
            bid.users?.email ||
            "Guest",
          checkInDate: format(new Date(bid.checkInDate), "MMM dd, yyyy"),
          checkOutDate: format(new Date(bid.checkOutDate), "MMM dd, yyyy"),
          totalNights: bid.totalNights,
          totalAmount: totalAmount.toFixed(2),
          commissionRate: commissionRate.toFixed(2),
          platformCommission: platformCommission.toFixed(2),
          payableToHotel: payableToHotel.toFixed(2),
          payoutMethod: bid.payoutMethod || null,
          payoutNotes: bid.payoutNotes || null,
          paidAt: format(new Date(), "MMM dd, yyyy 'at' h:mm a"),
          appName: "Death Is A Deadline",
        },
      });
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error("Failed to send payout email to hotel:", emailError);
    }
  }

  res.status(200).json({
    message: "Payout updated successfully",
    data: { bid: formatBid(bid) },
  });
}
