import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";
import { NewsletterSubscribeRequest } from "../validations/newsletter/newsletter.validation";

export async function subscribeNewsletter(req: Request, res: Response) {
  const { email } = req.body as NewsletterSubscribeRequest;

  await prisma.newsletterSubscriber.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  });

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
