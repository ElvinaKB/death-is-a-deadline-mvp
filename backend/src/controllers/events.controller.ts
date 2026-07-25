import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";

/**
 * Record a first-party browse event: a logged-in traveler opened a hotel
 * listing. Fired consent-gated from the client. Fire-and-forget — fail open
 * (never block the browse, and don't error if the table isn't there yet, which
 * keeps this deploy-order-safe until migration 039 runs).
 */
export async function recordPlaceView(req: Request, res: Response) {
  const userId = req.user!.id;
  const { placeId } = req.body as { placeId: string };

  try {
    await prisma.placeView.create({ data: { userId, placeId } });
  } catch (err) {
    console.warn("[events] place-view not recorded (migration 039 not run?):", err);
  }

  // Always 204 — the client doesn't care about the outcome.
  res.status(204).end();
}
