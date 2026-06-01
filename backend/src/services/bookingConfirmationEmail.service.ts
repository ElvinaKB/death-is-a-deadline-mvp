import { format } from "date-fns";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import { prisma } from "../libs/config/prisma";

/** Booking confirmation emails — webhook path only (PR 3). */
export async function sendBookingConfirmationEmails(
  paymentId: string,
): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: true,
      bid: { include: { place: true } },
    },
  });

  if (!payment?.bid?.place) {
    console.warn(
      `[booking-email] Skipping emails — missing bid/place for payment ${paymentId}`,
    );
    return;
  }

  const bid = payment.bid;
  const place = bid.place as typeof bid.place & { email?: string | null };
  const student = payment.student;

  const emailVariables = {
    studentName:
      (student.raw_user_meta_data as { name?: string })?.name ||
      student.email ||
      "Student",
    studentEmail: student.email || "",
    placeName: place.name,
    placeCity: place.city,
    placeCountry: place.country,
    checkInDate: format(new Date(bid.checkInDate), "MMMM d, yyyy"),
    checkOutDate: format(new Date(bid.checkOutDate), "MMMM d, yyyy"),
    totalNights: bid.totalNights,
    bidPerNight: Number(bid.bidPerNight).toFixed(2),
    totalAmount: Number(bid.totalAmount).toFixed(2),
    appName: process.env.EMAIL_NAME || "Education Bidding",
    dashboardUrl: `${process.env.CLIENT_URL}/student/my-bids`,
  };

  if (student.email) {
    try {
      await sendEmail({
        type: EmailType.BOOKING_CONFIRMED_STUDENT,
        to: student.email,
        subject: `Booking Confirmed - ${place.name}`,
        variables: emailVariables,
      });
    } catch (error) {
      console.error("Failed to send student confirmation email:", error);
    }
  }

  if (place.email) {
    try {
      await sendEmail({
        type: EmailType.BOOKING_CONFIRMED_PLACE,
        to: place.email,
        subject: `New Booking - ${place.name}`,
        variables: emailVariables,
      });
    } catch (error) {
      console.error("Failed to send place confirmation email:", error);
    }
  }
}
