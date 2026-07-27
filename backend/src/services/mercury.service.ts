import axios from "axios";

// Mercury API client for hotel payouts. We use the "Send Money with Approval"
// (request-send-money) flow — it needs no IP whitelist and every payment must
// be approved by a human in Mercury before the ACH actually sends. The token
// (MERCURY_API_TOKEN, a Custom scoped token) lives only in the backend env.
//
// Base URL is env-overridable so we can correct it without a code change if
// Mercury's host differs from the default.
const BASE_URL = process.env.MERCURY_API_BASE || "https://api.mercury.com/api/v1";

function mercuryClient() {
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) return null;
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
}

export function isConfigured(): boolean {
  return Boolean(process.env.MERCURY_API_TOKEN);
}

export interface MercuryAccount {
  id: string;
  name?: string;
  accountNumber?: string;
  availableBalance?: number;
  kind?: string;
  type?: string;
}

export interface MercuryRecipient {
  id: string;
  name?: string;
  emails?: string[];
}

export async function listAccounts(): Promise<MercuryAccount[]> {
  const c = mercuryClient();
  if (!c) throw new Error("MERCURY_API_TOKEN not set");
  const { data } = await c.get("/accounts");
  return data?.accounts ?? [];
}

export async function listRecipients(): Promise<MercuryRecipient[]> {
  const c = mercuryClient();
  if (!c) throw new Error("MERCURY_API_TOKEN not set");
  const { data } = await c.get("/recipients");
  return data?.recipients ?? [];
}

/**
 * Create an approval-gated ACH payout. Returns Mercury's response (includes the
 * request id + status). Does NOT send money — it queues a request that must be
 * approved in the Mercury dashboard/app. Built now; wired into the payout flow
 * once a hotel recipient + a real booking exist to test against.
 */
export async function requestSendMoney(input: {
  accountId: string;
  recipientId: string;
  amount: number;
  note?: string;
  idempotencyKey?: string;
}) {
  const c = mercuryClient();
  if (!c) throw new Error("MERCURY_API_TOKEN not set");
  const { data } = await c.post(`/account/${input.accountId}/request-send-money`, {
    recipientId: input.recipientId,
    amount: input.amount,
    paymentMethod: "ach",
    ...(input.note ? { note: input.note } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });
  return data;
}
