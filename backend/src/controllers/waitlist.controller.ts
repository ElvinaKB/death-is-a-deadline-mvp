import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { WaitlistSignupRequest } from "../validations/waitlist/waitlist.validation";

export async function joinWaitlist(req: Request, res: Response) {
  const { fullName, email, phone, source } = req.body as WaitlistSignupRequest;
  const normalizedEmail = email.toLowerCase();

  await prisma.waitlistSignup.upsert({
    where: { email: normalizedEmail },
    update: { fullName, phone, source },
    create: { fullName, email: normalizedEmail, phone, source },
  });

  // Waitlist signups are also newsletter subscribers — one list to email,
  // instead of maintaining two separate subscriber sets. Carry the extra
  // waitlist fields over so they're visible from the Newsletter admin view.
  await prisma.newsletterSubscriber.upsert({
    where: { email: normalizedEmail },
    update: { fullName, phone, source },
    create: { email: normalizedEmail, fullName, phone, source },
  });

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
