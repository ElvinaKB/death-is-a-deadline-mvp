import { useState, useEffect } from "react";
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
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { AlertTriangle, Building2 } from "lucide-react";
import { Bid } from "../../../types/bid.types";
import { useCancelBid } from "../../../hooks/useBids";

interface CancelBidModalProps {
  bid: Bid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelBidModal({ bid, open, onOpenChange }: CancelBidModalProps) {
  const cancelBid = useCancelBid();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, bid?.id]);

  if (!bid) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      amount,
    );

  const handleCancel = async () => {
    await cancelBid.mutateAsync({ id: bid.id, reason: reason.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-bg border-line">
        <DialogHeader>
          <DialogTitle className="text-fg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription className="text-muted">
            This immediately refunds {formatCurrency(bid.totalAmount)} to the
            guest's card and reopens the room on Cloudbeds. This cannot be
            undone.
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
              {formatBookingDate(bid.checkInDate, "MMM d, yyyy")} &ndash;{" "}
              {formatBookingDate(bid.checkOutDate, "MMM d, yyyy")}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-fg">Cancellation reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest requested cancellation — buyer's remorse"
              className="bg-glass border-line text-fg placeholder:text-muted"
              rows={3}
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
            onClick={handleCancel}
            disabled={!reason.trim() || cancelBid.isPending}
          >
            {cancelBid.isPending
              ? "Cancelling & refunding..."
              : "Cancel & refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
