import crypto from "crypto";
import { prisma } from "../config/prisma"; // adjust to your prisma client path

const INVITE_EXPIRY_MINUTES = 15;

/**
 * Creates (or replaces) a hotel invite token for the given email.
 * Expires in 15 minutes and can only be used once.
 */
export async function createHotelInviteToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000);

  // Upsert: replace any existing pending invite for this email
  await prisma.hotelInviteToken.upsert({
    where: { email },
    update: { token, expiresAt, usedAt: null },
    create: { email, token, expiresAt },
  });

  return token;
}

/**
 * Validates a token. Returns the associated email if valid and unused.
 * Does NOT consume it — call consumeHotelInviteToken() after signup succeeds.
 */
export async function validateHotelInviteToken(
  token: string,
): Promise<{ email: string } | null> {
  const record = await prisma.hotelInviteToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  return { email: record.email };
}

/**
 * Marks the token as used. Call this inside the hotel signup handler
 * immediately after the new user has been created.
 */
export async function consumeHotelInviteToken(token: string): Promise<void> {
  await prisma.hotelInviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}
