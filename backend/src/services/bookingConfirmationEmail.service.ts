import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import { prisma } from "../libs/config/prisma";
import { formatBookingDate } from "../libs/utils/hotelDates";
import { buildGoogleCalendarUrl } from "../email/googleCalendar";

// Deadline's commission on the room rate (Model B: guest pays this, hotel
// collects the rest at the desk). Also used to preview the split in the hotel
// email. COMMISSION_ONLY flips the hotel email to the "you collect 93% + tax"
// (Model B) layout; false today = MoR (guest charged in full).
const COMMISSION_RATE = 0.07;
const COMMISSION_ONLY = false;

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

  const appName = "Deadline";
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
    studentPhone:
      (student.raw_user_meta_data as { phone?: string })?.phone ||
      (student as { phone?: string }).phone ||
      null,
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
    mandatoryFeeAmount:
      Number(bid.mandatoryFeeAmount || 0) > 0
        ? Number(bid.mandatoryFeeAmount).toFixed(2)
        : null,
    grandTotal: (
      Number(bid.totalAmount) + Number(bid.mandatoryFeeAmount || 0)
    ).toFixed(2),
    appName,
  };

  // Variables for the redesigned hotel (place) email — its own template names.
  const roomRateNum = Number(bid.totalAmount);
  const commissionNum = Math.round(roomRateNum * COMMISSION_RATE * 100) / 100;
  const guestCount = 1; // Deadline doesn't collect occupancy count yet.
  const placeVariables = {
    hotelName: place.name,
    bookingId: baseVariables.reservationNumber,
    bookedAt: formatBookingDate(bid.createdAt, "MMM d, yyyy"),
    guestName: baseVariables.studentName,
    guestEmail: baseVariables.studentEmail,
    guestPhone: baseVariables.studentPhone,
    checkInFormatted: baseVariables.checkInDate,
    checkOutFormatted: baseVariables.checkOutDate,
    totalNights: bid.totalNights,
    guestCount,
    roomRate: roomRateNum.toFixed(2),
    commissionAmount: commissionNum.toFixed(2),
    hotelBalance: (roomRateNum - commissionNum).toFixed(2),
    commissionOnly: COMMISSION_ONLY,
    googleCalendarUrl: buildGoogleCalendarUrl({
      hotelName: place.name,
      guestName: baseVariables.studentName,
      bookingId: baseVariables.reservationNumber,
      checkIn: formatBookingDate(bid.checkInDate, "yyyy-MM-dd"),
      checkOut: formatBookingDate(bid.checkOutDate, "yyyy-MM-dd"),
      guestCount,
      roomType: "Selected by hotel",
      guestPhone: baseVariables.studentPhone,
      guestEmail: baseVariables.studentEmail,
    }),
    dashboardUrl: `${clientUrl}/hotel/bids`,
    appName,
  };

  // Internal copy of every confirmed booking — a backstop in case a hotel's
  // email is missing, wrong, or gets missed, so someone at Deadline always
  // has a record and can follow up directly if needed.
  const internalCopyInbox =
    process.env.BOOKING_COPY_INBOX_EMAIL || "hotels@deadlinetravel.com";

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
            googleCalendarUrl: placeVariables.googleCalendarUrl,
            dashboardUrl: `${clientUrl}/member/my-bids`,
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
          variables: placeVariables,
        }).catch((error) =>
          console.error("Failed to send place confirmation email:", error),
        )
      : Promise.resolve(),
    sendEmail({
      type: EmailType.BOOKING_CONFIRMED_PLACE,
      to: internalCopyInbox,
      subject: `[Booking Copy] ${place.name} — ${student.email || "guest"}`,
      variables: { ...placeVariables, dashboardUrl: `${clientUrl}/admin/bids` },
    }).catch((error) =>
      console.error("Failed to send internal booking copy email:", error),
    ),
  ]);
}
