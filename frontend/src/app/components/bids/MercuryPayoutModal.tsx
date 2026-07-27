import { useEffect, useState } from "react";
import { Loader2, Landmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { apiClient } from "../../../lib/apiClient";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { Bid } from "../../../types/bid.types";
import { formatCurrency } from "../../../utils/currency";

interface MercuryRecipient {
  id: string;
  name: string;
}

interface MercuryPayoutModalProps {
  bid: Bid;
  onClose: () => void;
  onPaid: () => void;
}

export function MercuryPayoutModal({
  bid,
  onClose,
  onPaid,
}: MercuryPayoutModalProps) {
  const [recipients, setRecipients] = useState<MercuryRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientId, setRecipientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ requestId: string | null } | null>(
    null,
  );

  const amount = bid.payableToHotel ?? 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get<{
          data: MercuryRecipient[];
          error?: string;
        }>(ENDPOINTS.MERCURY_RECIPIENTS);
        // apiClient unwraps `data`, so `data` here is the recipient array.
        if (!cancelled) setRecipients((data as unknown as MercuryRecipient[]) ?? []);
      } catch {
        if (!cancelled) setError("Couldn't load Mercury recipients.");
      } finally {
        if (!cancelled) setLoadingRecipients(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePay = async () => {
    if (!recipientId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await apiClient.post<{
        requestId: string | null;
        status: string;
      }>(ENDPOINTS.MERCURY_PAY, { bidId: bid.id, recipientId });
      // If the backend returned an error field, apiClient still resolves — guard.
      const r = resp as unknown as {
        requestId?: string | null;
        error?: string;
      };
      if (r?.error) {
        setError(r.error);
      } else {
        setResult({ requestId: r?.requestId ?? null });
        onPaid();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to create the payout.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-[#0a0a0a] border-line text-fg">
        <DialogTitle className="flex items-center gap-2 text-fg">
          <Landmark className="h-5 w-5 text-brand" />
          Pay hotel via Mercury
        </DialogTitle>
        <DialogDescription className="text-muted">
          Creates an ACH payout that you approve in Mercury before it sends.
        </DialogDescription>

        {result ? (
          <div className="space-y-3 py-2">
            <p className="text-success font-medium">
              ✅ Payout request created — pending your approval in Mercury.
            </p>
            <p className="text-sm text-muted">
              Approve it in the Mercury app to send the ACH. Request id:{" "}
              <span className="text-fg">{result.requestId ?? "created"}</span>
            </p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-line bg-white/[0.02] px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Hotel</span>
                <span className="text-fg">{bid.place?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted">Payout amount</span>
                <span className="text-fg font-semibold">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-fg">Mercury recipient</label>
              {loadingRecipients ? (
                <p className="text-sm text-muted">Loading recipients…</p>
              ) : recipients.length === 0 ? (
                <p className="text-sm text-warning">
                  No recipients in Mercury yet. Add the hotel's bank as a
                  recipient in the Mercury dashboard, then reopen this.
                </p>
              ) : (
                <select
                  className="w-full rounded-md bg-glass border border-line text-fg px-3 py-2"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                >
                  <option value="">Select a recipient…</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              className="w-full btn-bid-premium text-black"
              disabled={!recipientId || submitting || amount <= 0}
              onClick={handlePay}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating payout…
                </>
              ) : (
                `Create ${formatCurrency(amount)} payout`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
