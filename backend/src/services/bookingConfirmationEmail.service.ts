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
  const place = bid.place;
  const student = payment.student;

  const appName = process.env.EMAIL_NAME || "Death is a Deadline";
  const clientUrl = process.env.CLIENT_URL || "";
  const placeFullAddress = [place.address, place.city, place.country]
    .filter(Boolean)
    .join(", ");
  const mapsUrl =
    place.latitude != null && place.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
      : placeFullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeFullAddress)}`
        : null;

  const baseVariables = {
    studentName:
      (student.raw_user_meta_data as { name?: string })?.name ||
      student.email ||
      "Student",
    studentEmail: student.email || "",
    reservationNumber: `BID-${bid.id.split("-")[0].toUpperCase()}`,
    placeName: place.name,
    placeCity: place.city,
    placeCountry: place.country,
    placeFullAddress,
    placeContactEmail: place.email || null,
    placeContactPhone: null as string | null,
    mapsUrl,
    checkInDate: format(new Date(bid.checkInDate), "MMMM d, yyyy"),
    checkOutDate: format(new Date(bid.checkOutDate), "MMMM d, yyyy"),
    totalNights: bid.totalNights,
    bidPerNight: Number(bid.bidPerNight).toFixed(2),
    totalAmount: Number(bid.totalAmount).toFixed(2),
    appName,
  };

  if (student.email) {
    try {
      await sendEmail({
        type: EmailType.BOOKING_CONFIRMED_STUDENT,
        to: student.email,
        subject: `Booking Confirmed - ${place.name}`,
        variables: {
          ...baseVariables,
          dashboardUrl: `${clientUrl}/student/my-bids`,
        },
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
        variables: {
          ...baseVariables,
          dashboardUrl: `${clientUrl}/hotel/bids`,
        },
      });
    } catch (error) {
      console.error("Failed to send place confirmation email:", error);
    }
  }
}
