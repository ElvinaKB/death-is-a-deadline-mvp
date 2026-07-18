import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { WaitlistSignupRequest } from "../validations/waitlist/waitlist.validation";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

const INSTAGRAM_URL = "https://instagram.com/podshare";

async function sendWaitlistWelcomeEmail(email: string) {
  await sendEmail({
    type: EmailType.WAITLIST_WELCOME,
    to: email,
    subject: "🎉 You're in. Welcome to Deadline.",
    variables: {
      appName: "Deadline",
      marketplaceUrl: process.env.CLIENT_URL,
      referHotelUrl: `${process.env.CLIENT_URL}/contact`,
      instagramUrl: INSTAGRAM_URL,
      tiktokUrl: "https://www.tiktok.com/@podshare",
      linkedinUrl: "https://www.linkedin.com/company/142898679/admin/dashboard/",
    },
  });
}

export async function joinWaitlist(req: Request, res: Response) {
  const { fullName, email, phone, source, marketingConsent } =
    req.body as WaitlistSignupRequest;
  const normalizedEmail = email.toLowerCase();

  await prisma.waitlistSignup.upsert({
    where: { email: normalizedEmail },
    update: { fullName, phone, source, marketingConsent },
    create: { fullName, email: normalizedEmail, phone, source, marketingConsent },
  });

  if (marketingConsent) {
    // Waitlist signups are also newsletter subscribers — one list to email,
    // instead of maintaining two separate subscriber sets. Carry the extra
    // waitlist fields over so they're visible from the Newsletter admin view.
    await prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      update: { fullName, phone, source },
      create: { email: normalizedEmail, fullName, phone, source },
    });

    await sendWaitlistWelcomeEmail(normalizedEmail);
    await prisma.waitlistSignup.update({
      where: { email: normalizedEmail },
      data: { welcomeEmailSentAt: new Date() },
    });
  }

  res.json({ success: true, message: "You're on the list!" });
}

/** Admin-only: list waitlist signups, newest first. */
export async function listWaitlistSignups(_req: Request, res: Response) {
  const signups = await prisma.waitlistSignup.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: {
      signups,
      total: signups.length,
    },
  });
}

/** Admin-only: backfill-send the welcome email to consented signups that haven't received it yet. */
export async function sendWaitlistWelcomeEmails(_req: Request, res: Response) {
  const pending = await prisma.waitlistSignup.findMany({
    where: { marketingConsent: true, welcomeEmailSentAt: null },
  });

  for (const signup of pending) {
    await sendWaitlistWelcomeEmail(signup.email);
    await prisma.waitlistSignup.update({
      where: { id: signup.id },
      data: { welcomeEmailSentAt: new Date() },
    });
  }

  res.json({ success: true, sent: pending.length });
}
