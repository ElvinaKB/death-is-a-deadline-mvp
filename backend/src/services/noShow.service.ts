import { bid_status, payment_status } from "@prisma/client";
import { format } from "date-fns";
import Stripe from "stripe";
import { prisma } from "../libs/config/prisma";
import { stripe, STRIPE_CONFIG } from "../libs/config/stripe";
import { CustomError } from "../libs/utils/CustomError";
import { toCalendarDateKey } from "../libs/utils/hotelDates";
import { sendPlainEmail } from "../email/sendEmail";

// No-show charges (Model B). The guest paid only the 7% booking fee and their
// card was saved off-session with a no-show authorization in the terms. When a
// hotel reports a no-show within 72h of arrival, we charge up to the first
// night's room rate to that card. Hotel trust depends on this working, and
// guest trust depends on it never firing wrongly — hence the guards below.

export const NO_SHOW_STATUS = {
  PENDING: "PENDING",
  REQUIRES_ACTION: "REQUIRES_ACTION",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
} as const;

// The hotel must tell us within 72h of the scheduled arrival (hotel email,
// booking_confirmed_place.ejs). Counted from the end of the arrival day.
const REPORT_WINDOW_HOURS = 72;
const STRIPE_MIN_CHARGE = 0.5;

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function stayLabel(checkIn: Date, checkOut: Date) {
  // Dates are calendar dates stored at UTC midnight; format them as such.
  const d = (x: Date) => new Date(`${toCalendarDateKey(x)}T12:00:00`);
  return `${format(d(checkIn), "MMM d")}–${format(d(checkOut), "MMM d, yyyy")}`;
}

function guestName(meta: unknown): string {
  const name = (meta as { name?: string } | null)?.name;
  return name?.trim() || "there";
}

export interface ChargeNoShowInput {
  bidId: string;
  amount?: number;
  hotelReportedAt: Date;
  notes?: string;
  adminId: string;
}

/**
 * Charge a Model B no-show to the guest's saved card. Returns the charge row.
 * A bank that wants 3DS leaves the charge REQUIRES_ACTION and emails the guest
 * a link to approve it — we never retry around authentication.
 */
export async function chargeNoShow(input: ChargeNoShowInput) {
  const bid = await prisma.bid.findUnique({
    where: { id: input.bidId },
    include: {
      place: true,
      payment: true,
      noShowCharge: true,
      users: { select: { email: true, raw_user_meta_data: true } },
    },
  });
  if (!bid) throw new CustomError("Booking not found", 404);

  if (bid.place.supplySource === "wholesale") {
    throw new CustomError(
      "Wholesale bookings are paid through Nuitee — no-shows are handled by the hotel's own policy.",
      400,
    );
  }
  if (!(bid.place.commissionOnly ?? STRIPE_CONFIG.COMMISSION_ONLY_MODE)) {
    throw new CustomError(
      "This listing collects the full stay up front, so there's nothing extra to charge for a no-show.",
      400,
    );
  }
  const payment = bid.payment;
  if (bid.status !== bid_status.ACCEPTED || payment?.status !== payment_status.CAPTURED) {
    throw new CustomError("Only paid, active bookings can be charged a no-show.", 400);
  }
  if (!payment.stripeCustomerId || !payment.stripePaymentMethodId) {
    throw new CustomError(
      "No saved card on this booking (no Stripe customer/payment method).",
      400,
    );
  }

  const today = toCalendarDateKey(new Date());
  const checkIn = toCalendarDateKey(bid.checkInDate);
  if (today < checkIn) {
    throw new CustomError("The guest's arrival date hasn't come yet.", 400);
  }
  const reported = input.hotelReportedAt;
  const windowStart = new Date(`${checkIn}T00:00:00Z`);
  const windowEnd = new Date(
    windowStart.getTime() + (24 + REPORT_WINDOW_HOURS) * 60 * 60 * 1000,
  );
  if (Number.isNaN(reported.getTime()) || reported > new Date()) {
    throw new CustomError("Enter when the hotel reported the no-show (not in the future).", 400);
  }
  if (reported < windowStart || reported > windowEnd) {
    throw new CustomError(
      `The hotel must report a no-show within ${REPORT_WINDOW_HOURS}h of the arrival date (${checkIn}).`,
      400,
    );
  }

  // Policy: up to the first night's room rate — never taxes, never more.
  const firstNight = Number(bid.bidPerNight);
  const amount = Math.round((input.amount ?? firstNight) * 100) / 100;
  if (!(amount >= STRIPE_MIN_CHARGE) || amount > firstNight) {
    throw new CustomError(
      `Amount must be between ${money(STRIPE_MIN_CHARGE)} and the first night's rate (${money(firstNight)}).`,
      400,
    );
  }

  // Claim the booking so two clicks can't both charge. A new row is unique on
  // bid_id; a retry only proceeds if it flips FAILED -> PENDING itself.
  const payableToHotel =
    Math.round(amount * (1 - STRIPE_CONFIG.PLATFORM_COMMISSION_RATE) * 100) / 100;
  const fields = {
    amount,
    hotelReportedAt: reported,
    notes: input.notes?.trim() || null,
    chargedBy: input.adminId,
    payableToHotel,
    stripePaymentMethodId: payment.stripePaymentMethodId,
    failureReason: null,
  };
  let charge;
  if (!bid.noShowCharge) {
    try {
      charge = await prisma.noShowCharge.create({
        data: {
          bidId: bid.id,
          studentId: bid.studentId,
          status: NO_SHOW_STATUS.PENDING,
          ...fields,
        },
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") {
        throw new CustomError(
          "A no-show charge for this booking is already in progress.",
          409,
        );
      }
      throw err;
    }
  } else {
    const claimed = await prisma.noShowCharge.updateMany({
      where: { id: bid.noShowCharge.id, status: NO_SHOW_STATUS.FAILED },
      data: {
        status: NO_SHOW_STATUS.PENDING,
        attempts: { increment: 1 },
        stripePaymentIntentId: null,
        stripeClientSecret: null,
        ...fields,
      },
    });
    if (claimed.count !== 1) {
      const msg =
        bid.noShowCharge.status === NO_SHOW_STATUS.SUCCEEDED
          ? "This no-show has already been charged."
          : bid.noShowCharge.status === NO_SHOW_STATUS.REQUIRES_ACTION
            ? "Waiting on the guest to approve the charge with their bank."
            : "A no-show charge for this booking is already in progress.";
      throw new CustomError(msg, 409);
    }
    charge = await prisma.noShowCharge.findUniqueOrThrow({
      where: { id: bid.noShowCharge.id },
    });
  }

  let intent: Stripe.PaymentIntent | undefined;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: STRIPE_CONFIG.CURRENCY,
        customer: payment.stripeCustomerId,
        payment_method: payment.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description: `No-show — ${bid.place.name} (${stayLabel(bid.checkInDate, bid.checkOutDate)})`,
        metadata: {
          type: "no_show",
          no_show_charge_id: charge.id,
          [STRIPE_CONFIG.METADATA_KEYS.BID_ID]: bid.id,
          [STRIPE_CONFIG.METADATA_KEYS.PLACE_ID]: bid.placeId,
          [STRIPE_CONFIG.METADATA_KEYS.CHECK_IN_DATE]: checkIn,
          hotel_reported_at: reported.toISOString(),
        },
      },
      { idempotencyKey: `no-show-${charge.id}-${charge.attempts}` },
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      const failedIntent = err.payment_intent;
      if (err.code === "authentication_required" && failedIntent) {
        // The bank wants the cardholder present (3DS). Ask the guest.
        const updated = await prisma.noShowCharge.update({
          where: { id: charge.id },
          data: {
            status: NO_SHOW_STATUS.REQUIRES_ACTION,
            stripePaymentIntentId: failedIntent.id,
            stripeClientSecret: failedIntent.client_secret,
            failureReason: "Bank requires the guest to approve (3D Secure)",
          },
        });
        await emailGuestToAuthenticate(updated.id).catch((e) =>
          console.error("[no-show] 3DS email failed:", e),
        );
        return updated;
      }
      return prisma.noShowCharge.update({
        where: { id: charge.id },
        data: {
          status: NO_SHOW_STATUS.FAILED,
          stripePaymentIntentId: failedIntent?.id ?? null,
          failureReason: err.message || "Card was declined",
        },
      });
    }
    // Unknown error: we can't tell whether Stripe charged. Leave it PENDING —
    // the webhook settles it, and the PENDING claim blocks a double charge.
    console.error("[no-show] Stripe call failed:", err);
    await prisma.noShowCharge.update({
      where: { id: charge.id },
      data: { failureReason: "Stripe did not respond — check Stripe before retrying" },
    });
    throw new CustomError(
      "Stripe didn't respond. Check the Stripe dashboard before doing anything else.",
      502,
    );
  }

  await prisma.noShowCharge.update({
    where: { id: charge.id },
    data: {
      stripePaymentIntentId: intent.id,
      stripeClientSecret: intent.client_secret,
    },
  });
  if (intent.status === "succeeded") {
    await markNoShowSucceeded(charge.id);
  }
  return prisma.noShowCharge.findUniqueOrThrow({ where: { id: charge.id } });
}

/**
 * PENDING/REQUIRES_ACTION -> SUCCEEDED, exactly once (the API response and the
 * webhook both call this). Sends the receipts only on the transition.
 */
export async function markNoShowSucceeded(chargeId: string) {
  const { count } = await prisma.noShowCharge.updateMany({
    where: {
      id: chargeId,
      status: { in: [NO_SHOW_STATUS.PENDING, NO_SHOW_STATUS.REQUIRES_ACTION] },
    },
    data: {
      status: NO_SHOW_STATUS.SUCCEEDED,
      succeededAt: new Date(),
      failureReason: null,
      stripeClientSecret: null,
    },
  });
  if (count === 1) {
    await sendNoShowReceipts(chargeId).catch((e) =>
      console.error("[no-show] receipt emails failed:", e),
    );
  }
}

/**
 * Stripe webhook hook-in. Returns true when the intent belongs to a no-show
 * charge (so the booking-payment handler must skip it).
 */
export async function handleNoShowIntentEvent(
  eventType: string,
  intent: Stripe.PaymentIntent,
): Promise<boolean> {
  // By metadata too: the webhook can land before chargeNoShow saves the id.
  const chargeId = intent.metadata?.no_show_charge_id;
  const charge = await prisma.noShowCharge.findFirst({
    where: {
      OR: [
        { stripePaymentIntentId: intent.id },
        ...(chargeId ? [{ id: chargeId }] : []),
      ],
    },
  });
  if (!charge) return intent.metadata?.type === "no_show";
  // A late event from an earlier (failed) attempt must not touch this one.
  if (charge.stripePaymentIntentId && charge.stripePaymentIntentId !== intent.id) {
    return true;
  }

  if (eventType === "payment_intent.succeeded") {
    await markNoShowSucceeded(charge.id);
  } else if (eventType === "payment_intent.payment_failed") {
    // Only a charge still in flight fails here. REQUIRES_ACTION stays put so
    // the guest can try their bank again from the link.
    await prisma.noShowCharge.updateMany({
      where: { id: charge.id, status: NO_SHOW_STATUS.PENDING },
      data: {
        status: NO_SHOW_STATUS.FAILED,
        failureReason: intent.last_payment_error?.message || "Payment failed",
      },
    });
  } else if (eventType === "payment_intent.canceled") {
    await prisma.noShowCharge.updateMany({
      where: { id: charge.id, status: { not: NO_SHOW_STATUS.SUCCEEDED } },
      data: { status: NO_SHOW_STATUS.FAILED, failureReason: "Canceled in Stripe" },
    });
  }
  return true;
}

/** The guest's view of a charge waiting on their bank (3DS page). */
export async function getNoShowForGuest(chargeId: string, studentId: string) {
  const charge = await prisma.noShowCharge.findUnique({
    where: { id: chargeId },
    include: { bid: { include: { place: { select: { name: true, city: true } } } } },
  });
  if (!charge || charge.studentId !== studentId) {
    throw new CustomError("Charge not found", 404);
  }
  return {
    id: charge.id,
    status: charge.status,
    amount: Number(charge.amount),
    currency: charge.currency,
    hotel: charge.bid.place.name,
    city: charge.bid.place.city,
    checkInDate: toCalendarDateKey(charge.bid.checkInDate),
    checkOutDate: toCalendarDateKey(charge.bid.checkOutDate),
    clientSecret:
      charge.status === NO_SHOW_STATUS.REQUIRES_ACTION ? charge.stripeClientSecret : null,
    paymentMethodId:
      charge.status === NO_SHOW_STATUS.REQUIRES_ACTION ? charge.stripePaymentMethodId : null,
  };
}

/** After the guest finishes 3DS, don't wait for the webhook to show success. */
export async function syncNoShowForGuest(chargeId: string, studentId: string) {
  const charge = await prisma.noShowCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.studentId !== studentId) {
    throw new CustomError("Charge not found", 404);
  }
  if (charge.stripePaymentIntentId && charge.status === NO_SHOW_STATUS.REQUIRES_ACTION) {
    const intent = await stripe.paymentIntents.retrieve(charge.stripePaymentIntentId);
    if (intent.status === "succeeded") await markNoShowSucceeded(charge.id);
  }
  return getNoShowForGuest(chargeId, studentId);
}

async function loadForEmail(chargeId: string) {
  return prisma.noShowCharge.findUniqueOrThrow({
    where: { id: chargeId },
    include: {
      bid: {
        include: {
          place: { select: { name: true, email: true } },
          users: { select: { email: true, raw_user_meta_data: true } },
        },
      },
    },
  });
}

async function emailGuestToAuthenticate(chargeId: string) {
  const c = await loadForEmail(chargeId);
  const to = c.bid.users?.email;
  if (!to) return;
  const link = `${process.env.CLIENT_URL}/member/no-show/${c.id}`;
  const stay = stayLabel(c.bid.checkInDate, c.bid.checkOutDate);
  const lines = [
    `Hi ${guestName(c.bid.users?.raw_user_meta_data)},`,
    `${c.bid.place.name} let us know you didn't arrive for your booking (${stay}). Under the no-show policy you agreed to at booking, the first night (${money(Number(c.amount))}) is charged to the card you saved.`,
    `Your bank needs you to approve this charge. You can do that here: ${link}`,
    `If you think this is a mistake, just reply to this email and we'll sort it out with the hotel.`,
    `— Deadline`,
  ];
  await sendPlainEmail({
    to,
    subject: `Action needed: no-show charge for ${c.bid.place.name}`,
    html: lines.map((l) => `<p>${l.replace(link, `<a href="${link}">approve the charge</a>`)}</p>`).join(""),
    text: lines.join("\n\n"),
  });
}

async function sendNoShowReceipts(chargeId: string) {
  const c = await loadForEmail(chargeId);
  const stay = stayLabel(c.bid.checkInDate, c.bid.checkOutDate);
  const amount = money(Number(c.amount));

  // A clear receipt with a way to reach us is the best chargeback defense:
  // most disputes come from charges the guest doesn't recognise.
  const guestEmail = c.bid.users?.email;
  if (guestEmail) {
    const lines = [
      `Hi ${guestName(c.bid.users?.raw_user_meta_data)},`,
      `${c.bid.place.name} reported that you didn't arrive for your booking (${stay}). Under the no-show policy you agreed to at booking, we've charged the first night, ${amount}, to your saved card. It will show on your statement from Deadline.`,
      `If you think this is a mistake, reply to this email and we'll look into it with the hotel right away.`,
      `— Deadline`,
    ];
    await sendPlainEmail({
      to: guestEmail,
      subject: `No-show charge for ${c.bid.place.name}`,
      html: lines.map((l) => `<p>${l}</p>`).join(""),
      text: lines.join("\n\n"),
    }).catch((e) => console.error("[no-show] guest receipt failed:", e));
  }

  if (c.bid.place.email) {
    const lines = [
      `Hi ${c.bid.place.name},`,
      `We've charged the no-show you reported for ${stay}: ${amount}. Your share, ${money(Number(c.payableToHotel ?? 0))}, will be included in your next Deadline payout.`,
      `— Deadline`,
    ];
    await sendPlainEmail({
      to: c.bid.place.email,
      subject: `No-show charged — ${stay}`,
      html: lines.map((l) => `<p>${l}</p>`).join(""),
      text: lines.join("\n\n"),
    }).catch((e) => console.error("[no-show] hotel receipt failed:", e));
  }
}
