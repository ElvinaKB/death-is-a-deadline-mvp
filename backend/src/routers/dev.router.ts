import { Router, Request, Response } from "express";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

const router = Router();

const defaultVariables: Record<EmailType, Record<string, any>> = {
  [EmailType.ACCOUNT_REVIEW]: { name: "Test User", appName: "EduBid" },
  [EmailType.ACCOUNT_APPROVED]: { name: "Test User", appName: "EduBid" },
  [EmailType.ACCOUNT_REJECTED]: { name: "Test User", appName: "EduBid", reason: "Test rejection reason" },
  [EmailType.BOOKING_CONFIRMED_STUDENT]: {
    studentName: "Test User",
    appName: "EduBid",
    reservationNumber: "BID-A1B2C3D4",
    placeName: "Test Hotel",
    placeCity: "New York",
    placeCountry: "USA",
    checkInDate: "June 15, 2026",
    checkOutDate: "June 20, 2026",
    totalNights: 5,
    bidPerNight: "120.00",
    totalAmount: "600.00",
    dashboardUrl: "http://localhost:3000/student/my-bids",
  },
  [EmailType.BOOKING_CONFIRMED_PLACE]: { name: "Test Place", appName: "EduBid", bookingId: "TEST-123" },
  [EmailType.PAYOUT_SENT]: { name: "Test User", appName: "EduBid", amount: "100.00" },
  [EmailType.HOTEL_INVITE]: { name: "Test Hotel", appName: "EduBid", inviteLink: "http://localhost:3000/invite" },
  [EmailType.HOTEL_PLACE_CREATED]: { name: "Test Hotel", appName: "EduBid", placeName: "Test Place" },
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
