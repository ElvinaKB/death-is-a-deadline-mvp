import { Router, Request, Response } from "express";
import { format } from "date-fns";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import { prisma } from "../libs/config/prisma";
import { bid_status } from "@prisma/client";
import { sendPlainEmail } from "../email/sendEmail";
import * as mercury from "../services/mercury.service";

const router = Router();

function errMessage(err: unknown): string {
  const e = err as { response?: { data?: unknown; status?: number }; message?: string };
  if (e?.response?.data) return JSON.stringify(e.response.data).slice(0, 500);
  return e?.message || "Mercury request failed";
}

// Connectivity check for the Mercury payout integration (admin only). Reads
// accounts + recipients so we can confirm the token works end-to-end without
// ever exposing the token itself.
router.get(
  "/mercury/health",
  authenticate(UserRole.ADMIN),
  async (_req: Request, res: Response) => {
    if (!mercury.isConfigured()) {
      return res.json({
        data: { connected: false, reason: "MERCURY_API_TOKEN not set" },
      });
    }
    try {
      const [accounts, recipients] = await Promise.all([
        mercury.listAccounts(),
        mercury.listRecipients(),
      ]);
      return res.json({
        data: {
          connected: true,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name ?? null,
            last4: (a.accountNumber || "").slice(-4) || null,
            availableBalance: a.availableBalance ?? null,
          })),
          recipientCount: recipients.length,
        },
      });
    } catch (err) {
      const e = err as { response?: { status?: number } };
      return res.json({
        data: {
          connected: false,
          reason: errMessage(err),
          status: e?.response?.status ?? null,
        },
      });
    }
  },
);

// List Mercury recipients (admin only) so we can map a hotel to its recipient
// id when wiring a payout.
router.get(
  "/mercury/recipients",
  authenticate(UserRole.ADMIN),
  async (_req: Request, res: Response) => {
    try {
      const recipients = await mercury.listRecipients();
      return res.json({
        data: recipients.map((r) => ({ id: r.id, name: r.name ?? "—" })),
      });
    } catch (err) {
      return res.status(200).json({ data: [], error: errMessage(err) });
    }
  },
);

// Create an approval-gated Mercury ACH payout for an accepted bid (admin only).
// Does NOT mark the bid paid — the payment sits pending your approval in
// Mercury. We record the Mercury request id in the payout notes.
router.post(
  "/mercury/pay",
  authenticate(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { bidId, recipientId } = req.body as {
      bidId?: string;
      recipientId?: string;
    };
    if (!bidId || !recipientId) {
      return res
        .status(400)
        .json({ message: "bidId and recipientId are required" });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { place: true },
    });
    if (!bid) return res.status(404).json({ message: "Bid not found" });
    if (bid.status !== bid_status.ACCEPTED) {
      return res
        .status(400)
        .json({ message: "Only accepted bids can be paid out" });
    }
    const amount = bid.payableToHotel != null ? Number(bid.payableToHotel) : 0;
    if (!(amount > 0)) {
      return res.status(400).json({
        message: "This bid has no payout amount (payableToHotel) set",
      });
    }

    try {
      let accountId = process.env.MERCURY_ACCOUNT_ID;
      if (!accountId) {
        const accounts = await mercury.listAccounts();
        accountId = accounts[0]?.id;
      }
      if (!accountId) {
        return res
          .status(200)
          .json({ error: "No Mercury account found to send from" });
      }

      const note = `Deadline payout — ${bid.place?.name ?? "hotel"} · ${format(
        bid.checkInDate,
        "MMM d",
      )}–${format(bid.checkOutDate, "MMM d, yyyy")}`;

      const result = (await mercury.requestSendMoney({
        accountId,
        recipientId,
        amount,
        note,
        idempotencyKey: `deadline-payout-${bid.id}`,
      })) as { id?: string; requestId?: string; status?: string };

      const requestId = result?.id ?? result?.requestId ?? null;
      await prisma.bid.update({
        where: { id: bid.id },
        data: {
          payoutMethod: "Mercury ACH (approval)",
          payoutNotes: `Mercury request ${
            requestId ?? "created"
          } — pending approval in Mercury`,
        },
      });

      // Best-effort payout-ETA email to the hotel.
      if (bid.place?.email) {
        const stay = `${format(bid.checkInDate, "MMM d")}–${format(
          bid.checkOutDate,
          "MMM d, yyyy",
        )}`;
        const etaText = `A payout of $${amount.toFixed(
          2,
        )} for your Deadline booking (${stay}) has been initiated via ACH and typically arrives within 1–3 business days.`;
        try {
          await sendPlainEmail({
            to: bid.place.email,
            subject: `Payout on the way from Deadline — ${bid.place.name}`,
            html: `<p>Hi ${bid.place.name},</p><p>${etaText}</p><p>&mdash; Deadline</p>`,
            text: [`Hi ${bid.place.name},`, "", etaText, "", "— Deadline"].join(
              "\n",
            ),
          });
        } catch {
          // never block the payout on an email hiccup
        }
      }

      return res.json({
        data: {
          requestId,
          status: result?.status ?? "pending_approval",
          amount,
        },
      });
    } catch (err) {
      return res.status(200).json({ error: errMessage(err) });
    }
  },
);

export { router };
