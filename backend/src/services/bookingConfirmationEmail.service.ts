import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import { prisma } from "../libs/config/prisma";
import { formatBookingDate } from "../libs/utils/hotelDates";

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
    placeContactPhone: place.reservationPhone || null,
    mapsUrl,
    checkInDate: formatBookingDate(bid.checkInDate, "MMMM d, yyyy"),
    checkOutDate: formatBookingDate(bid.checkOutDate, "MMMM d, yyyy"),
    totalNights: bid.totalNights,
    bidPerNight: Number(bid.bidPerNight).toFixed(2),
    totalAmount: Number(bid.totalAmount).toFixed(2),
    appName,
  };

  // Internal copy of every confirmed booking — a backstop in case a hotel's
  // email is missing, wrong, or gets missed, so someone at Deadline always
  // has a record and can follow up directly if needed.
  const internalCopyInbox =
    process.env.BOOKING_COPY_INBOX_EMAIL || "deadline@podshare.com";

  // These three don't depend on each other, so send them concurrently
  // instead of one-at-a-time — each still fails independently.
  await Promise.allSettled([
    student.email
      ? sendEmail({
          type: EmailType.BOOKING_CONFIRMED_STUDENT,
          to: student.email,
          subject: `Booking Confirmed - ${place.name}`,
          variables: {
            ...baseVariables,
            dashboardUrl: `${clientUrl}/student/my-bids`,
          },
        }).catch((error) =>
          console.error("Failed to send student confirmation email:", error),
        )
      : Promise.resolve(),
    place.email
      ? sendEmail({
          type: EmailType.BOOKING_CONFIRMED_PLACE,
          to: place.email,
          subject: `New Booking - ${place.name}`,
          variables: {
            ...baseVariables,
            dashboardUrl: `${clientUrl}/hotel/bids`,
          },
        }).catch((error) =>
          console.error("Failed to send place confirmation email:", error),
        )
      : Promise.resolve(),
    sendEmail({
      type: EmailType.BOOKING_CONFIRMED_PLACE,
      to: internalCopyInbox,
      subject: `[Booking Copy] ${place.name} — ${student.email || "guest"}`,
      variables: {
        ...baseVariables,
        dashboardUrl: `${clientUrl}/admin/bids`,
      },
    }).catch((error) =>
      console.error("Failed to send internal booking copy email:", error),
    ),
  ]);
}
