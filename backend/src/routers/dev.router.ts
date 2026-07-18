import { Router, Request, Response } from "express";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

const router = Router();

const defaultVariables: Record<EmailType, Record<string, any>> = {
  [EmailType.ACCOUNT_REVIEW]: { name: "Test User", appName: "Deadline" },
  [EmailType.ACCOUNT_APPROVED]: {
    name: "Test User",
    appName: "Deadline",
    loginUrl: "http://localhost:5173/login",
  },
  [EmailType.ACCOUNT_REJECTED]: {
    name: "Test User",
    appName: "Deadline",
    loginUrl: "http://localhost:5173/resubmit?token=test",
    rejectionReason: "Test rejection reason",
  },
  [EmailType.BOOKING_CONFIRMED_STUDENT]: {
    studentName: "Test User",
    appName: "Deadline",
    reservationNumber: "BID-A1B2C3D4",
    placeName: "Test Hotel",
    placeCity: "New York",
    placeCountry: "USA",
    placeFullAddress: "350 5th Ave, New York, USA",
    placeContactEmail: "frontdesk@testhotel.com",
    placeContactPhone: "(555) 555-5555",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=350+5th+Ave,+New+York,+USA",
    checkInDate: "June 15, 2026",
    checkOutDate: "June 20, 2026",
    totalNights: 5,
    bidPerNight: "120.00",
    totalAmount: "600.00",
    dashboardUrl: "http://localhost:5173/student/my-bids",
  },
  [EmailType.BOOKING_CONFIRMED_PLACE]: {
    studentName: "Test User",
    studentEmail: "student@example.com",
    appName: "Deadline",
    placeName: "Test Hotel",
    checkInDate: "June 15, 2026",
    checkOutDate: "June 20, 2026",
    totalNights: 5,
    bidPerNight: "120.00",
    totalAmount: "600.00",
    dashboardUrl: "http://localhost:5173/hotel/bids",
  },
  [EmailType.PAYOUT_SENT]: {
    appName: "Deadline",
    placeName: "Test Hotel",
    studentName: "Test User",
    checkInDate: "June 15, 2026",
    checkOutDate: "June 20, 2026",
    totalNights: 5,
    totalAmount: "600.00",
    commissionRate: "6.66",
    platformCommission: "39.96",
    payableToHotel: "560.04",
    payoutMethod: "Bank transfer",
    payoutNotes: null,
    paidAt: "Jun 21, 2026 at 2:30 PM",
  },
  [EmailType.HOTEL_INVITE]: {
    appName: "Deadline",
    placeName: "Test Hotel",
    placeCity: "New York",
    placeCountry: "USA",
    inviteUrl: "http://localhost:5173/hotel/signup?token=test",
    expiryDays: 7,
  },
  [EmailType.HOTEL_PLACE_CREATED]: {
    appName: "Deadline",
    placeName: "Test Hotel",
    placeCity: "New York",
    placeCountry: "USA",
    dashboardUrl: "http://localhost:5173/hotel/dashboard",
  },
  [EmailType.WAITLIST_WELCOME]: {
    appName: "Deadline",
    marketplaceUrl: "http://localhost:5173",
    referHotelUrl: "http://localhost:5173/contact",
    instagramUrl: "https://instagram.com/podshare",
  },
};

router.post("/email", async (req: Request, res: Response) => {
  const { type, to, subject, variables } = req.body;

  if (!type || !Object.values(EmailType).includes(type)) {
    res.status(400).json({
      error: "Invalid or missing email type",
      validTypes: Object.values(EmailType),
    });
    return;
  }

  const recipient = to || "tauheed.butt@gmail.com";
  const emailSubject = subject || `[TEST] ${type}`;
  const emailVariables = { ...defaultVariables[type as EmailType], ...variables };

  await sendEmail({ type, to: recipient, subject: emailSubject, variables: emailVariables });

  res.json({ success: true, type, to: recipient, subject: emailSubject });
});

export { router };
