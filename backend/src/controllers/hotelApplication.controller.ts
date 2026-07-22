import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { sendPlainEmail } from "../email/sendEmail";
import { verifyTurnstileToken } from "../services/turnstile.service";
import { HotelApplicationRequest } from "../validations/hotelApplication/hotelApplication.validation";

const HOTEL_LEADS_INBOX =
  process.env.CONTACT_INBOX_EMAIL || "deadline@podshare.com";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PMS_LABELS: Record<string, string> = {
  cloudbeds: "Cloudbeds",
  siteminder: "SiteMinder",
  other: "Other",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitHotelApplication(req: Request, res: Response) {
  const body = req.body as HotelApplicationRequest;

  const remoteIp =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : undefined) || req.socket.remoteAddress;

  await verifyTurnstileToken(body.turnstileToken, remoteIp);

  const application = await prisma.hotelApplication.create({
    data: {
      hotelName: body.hotelName,
      address: body.address,
      phone: body.phone,
      email: body.email.toLowerCase(),
      daysOfWeek: body.daysOfWeek,
      roomsPerDay: body.roomsPerDay,
      secretPrice: body.secretPrice,
      pms: body.pms,
      pmsOther: body.pmsOther?.trim() || null,
    },
  });

  const days = body.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");
  const pms = [
    ...body.pms.map((p) => PMS_LABELS[p] ?? p),
    ...(body.pmsOther?.trim() ? [`Other: ${body.pmsOther.trim()}`] : []),
  ].join(", ");

  const html = `
    <h2>New hotel sign-up</h2>
    <p><strong>Hotel:</strong> ${escapeHtml(body.hotelName)}</p>
    <p><strong>Address:</strong> ${escapeHtml(body.address)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>
    <p><strong>Reservations email:</strong> ${escapeHtml(body.email)}</p>
    <hr />
    <p><strong>Days offered:</strong> ${escapeHtml(days)}</p>
    <p><strong>Rooms per day:</strong> ${body.roomsPerDay}</p>
    <p><strong>Secret price:</strong> $${Number(body.secretPrice).toFixed(2)}</p>
    <p><strong>PMS:</strong> ${escapeHtml(pms || "—")}</p>
  `;

  const text = [
    `Hotel: ${body.hotelName}`,
    `Address: ${body.address}`,
    `Phone: ${body.phone}`,
    `Reservations email: ${body.email}`,
    `Days offered: ${days}`,
    `Rooms per day: ${body.roomsPerDay}`,
    `Secret price: $${Number(body.secretPrice).toFixed(2)}`,
    `PMS: ${pms || "—"}`,
  ].join("\n");

  // Notify the leads inbox. Fail-open on email so a mail hiccup never loses
  // the lead (it's already persisted above).
  try {
    await sendPlainEmail({
      to: HOTEL_LEADS_INBOX,
      subject: `[Deadline Hotel Sign-up] ${body.hotelName}`,
      html,
      text,
      replyTo: body.email,
    });
  } catch (err) {
    console.error("[hotel-application] lead email failed to send", err);
  }

  res.json({
    success: true,
    message: "We've got it — we'll be in touch to get you listed.",
    data: { id: application.id },
  });
}

/** Admin-only: list hotel applications, newest first. */
export async function listHotelApplications(_req: Request, res: Response) {
  const applications = await prisma.hotelApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: {
      applications,
      total: applications.length,
    },
  });
}
