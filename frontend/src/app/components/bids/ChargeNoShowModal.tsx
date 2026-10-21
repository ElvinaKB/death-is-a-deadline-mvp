import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatBookingDate } from "../../../utils/dateHelpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Building2, CreditCard } from "lucide-react";
import { Bid, BidNoShowCharge } from "../../../types/bid.types";
import { useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";

interface ChargeNoShowModalProps {
  bid: Bid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChargeNoShowResponse {
  message: string;
  noShowCharge: BidNoShowCharge;
}

// Mirrors the backend cap (noShow.service): first night less the 7% fee.
const noShowMaxFee = (perNight: number) => Math.round(perNight * 0.93 * 100) / 100;

// Model B no-show: charge up to the first night to the guest's saved card,
// once the hotel reports it within 72h of arrival.
export function ChargeNoShowModal({ bid, open, onOpenChange }: ChargeNoShowModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reportedAt, setReportedAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && bid) {
      setAmount(noShowMaxFee(bid.bidPerNight).toFixed(2));
      setReportedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setNotes("");
    }
  }, [open, bid]);

  const charge = useApiMutation<
    ChargeNoShowResponse,
    { bidId: string; amount: number; hotelReportedAt: string; notes?: string }
  >({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_NO_SHOW_CHARGE, { bidId: vars.bidId }),
    transformVariables: ({ bidId: _bidId, ...body }) => body,
    onSuccess: (res) => {
      const status = res.noShowCharge.status;
      if (status === "SUCCEEDED") toast.success(res.message);
      else if (status === "FAILED") toast.error(res.message);
      else toast.info(res.message);
      queryClient.invalidateQueries({ queryKey: ["bids", "admin"] });
      onOpenChange(false);
    },
  });

  if (!bid) return null;

  const firstNight = bid.bidPerNight;
  const maxFee = noShowMaxFee(firstNight);
  const value = Number(amount);
  const validAmount = value >= 0.5 && value <= maxFee;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const submit = () =>
    charge.mutate({
      bidId: bid.id,
      amount: value,
      hotelReportedAt: new Date(reportedAt).toISOString(),
      notes: notes.trim() || undefined,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-bg border-line">
        <DialogHeader>
          <DialogTitle className="text-fg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-danger" />
            Charge no-show
          </DialogTitle>
          <DialogDescription className="text-muted">
            Charges the guest&apos;s saved card for the first night, less the 7%
            booking fee they already paid. Only do this
            when the hotel has confirmed the guest never arrived. The guest and
            the hotel both get a receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="glass rounded-lg p-4 space-y-2 border border-line text-sm">
            <p className="font-medium text-fg flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted" />
              {bid.place?.name || "N/A"}
            </p>
            <p className="text-muted">
              {bid.student?.name || "N/A"} &middot; {bid.student?.email}
            </p>
            <p className="text-muted">
              Arrival {formatBookingDate(bid.checkInDate, "MMM d, yyyy")} &middot;{" "}
              {formatCurrency(firstNight)}/night
            </p>
            {bid.noShowCharge?.status === "FAILED" && (
              <p className="text-danger">
                Last attempt failed: {bid.noShowCharge.failureReason}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-fg">When did the hotel report the no-show?</Label>
            <Input
              type="datetime-local"
              value={reportedAt}
              onChange={(e) => setReportedAt(e.target.value)}
              className="bg-glass border-line text-fg"
            />
            <p className="text-xs text-muted">
              Must be within 72 hours of the arrival date.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-fg">Amount (max first night less 7%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.5"
              max={maxFee}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-glass border-line text-fg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-fg">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GM Maria emailed at 9:40am, room held all night"
              className="bg-glass border-line text-fg placeholder:text-muted"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-line text-fg"
          >
            Never mind
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={!validAmount || !reportedAt || charge.isPending}
          >
            {charge.isPending
              ? "Charging..."
              : `Charge ${validAmount ? formatCurrency(value) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
