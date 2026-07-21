import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";
import { prisma } from "../libs/config/prisma";
import { formatBookingDate } from "../libs/utils/hotelDates";

/** Guest-facing cancellation + refund confirmation email. */
export async function sendBookingCancellationEmail(
  bidId: string,
): Promise<void> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { place: true, users: true },
  });

  if (!bid?.place || !bid.users?.email) {
    console.warn(
      `[cancellation-email] Skipping — missing bid/place/email for bid ${bidId}`,
    );
    return;
  }

  await sendEmail({
    type: EmailType.BOOKING_CANCELLED_STUDENT,
    to: bid.users.email,
    subject: `Reservation Cancelled - ${bid.place.name}`,
    variables: {
      studentName:
        (bid.users.raw_user_meta_data as { name?: string })?.name ||
        bid.users.email,
      reservationNumber: `BID-${bid.id.split("-")[0].toUpperCase()}`,
      placeName: bid.place.name,
      checkInDate: formatBookingDate(bid.checkInDate, "MMMM d, yyyy"),
      checkOutDate: formatBookingDate(bid.checkOutDate, "MMMM d, yyyy"),
      totalAmount: Number(bid.totalAmount).toFixed(2),
      cancellationReason: bid.rejectionReason || null,
      appName: "Deadline",
    },
  }).catch((error) =>
    console.error("Failed to send booking cancellation email:", error),
  );
}
