import { Router, Request, Response } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
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

export { router };
