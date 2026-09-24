import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { WaitlistSignupRequest } from "../validations/waitlist/waitlist.validation";
import { sendEmail } from "../email/sendEmail";
import { EmailType } from "../email/emailTypes";

const LINKEDIN_PROFILE_RE = /^\s*(https?:\/\/)?(www\.)?linkedin\.com\/in\/\S+\s*$/i;

/** Canonical https LinkedIn profile URL, without share/tracking parameters. */
function normalizeLinkedIn(raw: string): string {
  const cleaned = raw.trim().split(/[?#]/)[0];
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

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
    },
  });
}

export async function joinWaitlist(req: Request, res: Response) {
  // Email is already trimmed + lowercased by the validation schema.
  const { fullName, email, phone, marketingConsent, ...rest } =
    req.body as WaitlistSignupRequest;

  // The "where did you hear about us" box is often used to paste a LinkedIn
  // profile. Keep that in its own field so it can be used later to verify the
  // person, and leave "source" for the actual answer.
  const sourceIsLinkedIn = !!rest.source && LINKEDIN_PROFILE_RE.test(rest.source);
  const rawLinkedIn = rest.linkedinUrl || (sourceIsLinkedIn ? rest.source : undefined);
  const linkedinUrl = rawLinkedIn ? normalizeLinkedIn(rawLinkedIn) : undefined;
  const source = sourceIsLinkedIn ? undefined : rest.source;

  // One row per email, no matter how many times it's submitted (self-signup,
  // then someone entering the same address by hand). A repeat never overwrites
  // what's already there — it only fills in blanks and can turn consent on.
  const existing = await prisma.waitlistSignup.findUnique({ where: { email } });
  const signup = existing
    ? await prisma.waitlistSignup.update({
        where: { email },
        data: {
          phone: existing.phone ?? phone,
          source: existing.source ?? source,
          linkedinUrl: existing.linkedinUrl ?? linkedinUrl,
          marketingConsent: existing.marketingConsent || marketingConsent,
        },
      })
    : await prisma.waitlistSignup.create({
        data: { fullName, email, phone, source, linkedinUrl, marketingConsent },
      });

  if (signup.marketingConsent) {
    // Waitlist signups are also newsletter subscribers — one list to email,
    // instead of maintaining two separate subscriber sets. Carry the extra
    // waitlist fields over so they're visible from the Newsletter admin view.
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (!subscriber) {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          fullName: signup.fullName,
          phone: signup.phone,
          source: signup.source,
          linkedinUrl: signup.linkedinUrl,
        },
      });
    } else {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          fullName: subscriber.fullName ?? signup.fullName,
          phone: subscriber.phone ?? signup.phone,
          source: subscriber.source ?? signup.source,
          linkedinUrl: subscriber.linkedinUrl ?? signup.linkedinUrl,
        },
      });
    }

    // Welcome email goes out once per person, and a mail-server hiccup must
    // never make an already-saved signup look like it failed.
    if (!signup.welcomeEmailSentAt) {
      try {
        await sendWaitlistWelcomeEmail(email);
        await prisma.waitlistSignup.update({
          where: { email },
          data: { welcomeEmailSentAt: new Date() },
        });
      } catch (err) {
        console.error("[waitlist] welcome email failed", err);
      }
    }
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

  res.json({ data: { success: true, sent: pending.length } });
}
