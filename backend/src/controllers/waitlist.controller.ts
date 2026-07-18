import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { WaitlistSignupRequest } from "../validations/waitlist/waitlist.validation";

export async function joinWaitlist(req: Request, res: Response) {
  const { fullName, email, phone, source } = req.body as WaitlistSignupRequest;

  await prisma.waitlistSignup.upsert({
    where: { email: email.toLowerCase() },
    update: { fullName, phone, source },
    create: { fullName, email: email.toLowerCase(), phone, source },
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
