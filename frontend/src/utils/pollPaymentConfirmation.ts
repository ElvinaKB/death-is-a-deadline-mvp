import { apiClient } from "../lib/apiClient";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";
import {
  ConfirmPaymentData,
  PaymentStatus,
} from "../types/payment.types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// PAYMENT_FLOW_V2 (active) — see frontend/docs/payment-flow-toggle.md
export function isStripeChargeComplete(stripeStatus: string): boolean {
  return (
    stripeStatus === "succeeded" ||
    stripeStatus === "processing" ||
    stripeStatus === "requires_capture"
  );
}

/* PAYMENT_FLOW_V1 START — uncomment and comment V2 block above to restore legacy
function isStripeChargeComplete(stripeStatus: string): boolean {
  return stripeStatus === "succeeded" || stripeStatus === "processing";
}
PAYMENT_FLOW_V1 END */

function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return (
    status === PaymentStatus.CAPTURED ||
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.CANCELLED ||
    status === PaymentStatus.REQUIRES_ACTION
  );
}

/** Short poll of read-only confirm until webhook marks CAPTURED (PR 3). */
export async function pollPaymentUntilCaptured(
  paymentId: string,
  options?: { maxPolls?: number; intervalMs?: number },
): Promise<ConfirmPaymentData> {
  const maxPolls = options?.maxPolls ?? 4;
  const intervalMs = options?.intervalMs ?? 1000;

  let last = await apiClient.post<ConfirmPaymentData>(
    getEndpoint(ENDPOINTS.PAYMENT_CONFIRM, { id: paymentId }),
    {},
  );

  if (isTerminalPaymentStatus(last.payment.status) || !last.pendingWebhook) {
    return last;
  }

  for (let poll = 0; poll < maxPolls; poll++) {
    await sleep(intervalMs);
    last = await apiClient.post<ConfirmPaymentData>(
      getEndpoint(ENDPOINTS.PAYMENT_CONFIRM, { id: paymentId }),
      {},
    );
    if (isTerminalPaymentStatus(last.payment.status) || !last.pendingWebhook) {
      return last;
    }
  }

  if (isStripeChargeComplete(last.stripeStatus)) {
    return last;
  }

  return last;
}
