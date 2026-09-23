import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { NewsletterSubscribeRequest } from "../validations/newsletter/newsletter.validation";

export async function subscribeNewsletter(req: Request, res: Response) {
  const { email, fullName } = req.body as NewsletterSubscribeRequest;

  // One row per email. If they're already on the list (e.g. added earlier
  // from the waitlist), don't create a second row or overwrite their details
  // — only fill in a name if we didn't have one.
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });
  if (!existing) {
    await prisma.newsletterSubscriber.create({ data: { email, fullName } });
  } else if (!existing.fullName) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { fullName },
    });
  }

  res.json({ success: true, message: "You're on the list!" });
}

/** Admin-only: list newsletter subscribers, newest first. */
export async function listNewsletterSubscribers(_req: Request, res: Response) {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: {
      subscribers,
      total: subscribers.length,
    },
  });
}
