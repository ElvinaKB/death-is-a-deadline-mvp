import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  User,
  Calendar,
  CreditCard,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Bid, PAYOUT_METHODS, PayoutMethod } from "../../../types/bid.types";
import { useUpdatePayout } from "../../../hooks/useBids";
import { cn } from "../ui/utils";

interface PayoutModalProps {
  bid: Bid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayoutModal({ bid, open, onOpenChange }: PayoutModalProps) {
  const updatePayout = useUpdatePayout();

  const [payoutMethod, setPayoutMethod] = useState<string>("");
  const [isPaidToHotel, setIsPaidToHotel] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState("");

  // Reset form when bid changes
  useEffect(() => {
    if (bid) {
      setPayoutMethod(bid.payoutMethod || "");
      setIsPaidToHotel(bid.isPaidToHotel);
      setPayoutNotes(bid.payoutNotes || "");
    }
  }, [bid]);

  if (!bid) return null;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSave = async () => {
    await updatePayout.mutateAsync({
      id: bid.id,
      payoutMethod: payoutMethod || undefined,
      isPaidToHotel,
      payoutNotes: payoutNotes || undefined,
    });
    onOpenChange(false);
  };

  const isPaymentCaptured = bid.payment?.status === "CAPTURED";
  const canPayout = isPaymentCaptured;

  // Calculate commission rate for display
  const commissionRate =
    bid.totalAmount && bid.platformCommission
      ? ((bid.platformCommission / bid.totalAmount) * 100).toFixed(2)
      : "6.66";

  const onOpenStripe = () => {
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "https://dashboard.stripe.com/test/payments"
        : "https://dashboard.stripe.com/payments";

    window.open(`${baseUrl}/${bid.payment!.stripePaymentIntentId}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col bg-bg border-line">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-fg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-brand" />
            Hotel Payout Details
          </DialogTitle>
          <DialogDescription className="text-muted">
            Manage payout to hotel for this booking.
            {/* Future: This will integrate with Stripe Connect for automatic payouts */}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
          {/* Booking Summary */}
          <div className="glass rounded-lg p-4 space-y-3 border border-line">
            <h4 className="font-medium text-fg flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted" />
              Booking Summary
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted">Hotel:</span>
                <p className="font-medium text-fg">
                  {bid.place?.name || "N/A"}
                </p>
                {bid.place?.email && (
                  <p className="text-xs text-muted">{bid.place.email}</p>
                )}
              </div>
              <div>
                <span className="text-muted">Student:</span>
                <p className="font-medium text-fg">
                  {bid.student?.name || "N/A"}
                </p>
                <p className="text-xs text-muted">{bid.student?.email}</p>
              </div>
              <div>
                <span className="text-muted">Check-in:</span>
                <p className="font-medium text-fg">
                  {format(new Date(bid.checkInDate), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <span className="text-muted">Check-out:</span>
                <p className="font-medium text-fg">
                  {format(new Date(bid.checkOutDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="glass rounded-lg p-4 space-y-3 border border-line">
            <h4 className="font-medium text-fg flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted" />
              Financial Breakdown
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">
                  Total Amount ({bid.totalNights} nights ×{" "}
                  {formatCurrency(bid.bidPerNight)})
                </span>
                <span className="font-medium text-fg">
                  {formatCurrency(bid.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-warning">
                <span>Platform Commission ({commissionRate}%)</span>
                <span>- {formatCurrency(bid.platformCommission)}</span>
              </div>
              <div className="border-t border-line pt-2 flex justify-between">
                <span className="font-semibold text-fg">Payable to Hotel</span>
                <span className="font-bold text-success text-lg">
                  {formatCurrency(bid.payableToHotel)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="glass rounded-lg p-4 space-y-3 border border-line">
            <h4 className="font-medium text-fg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted" />
              Status
            </h4>

            <div className="flex flex-wrap gap-2">
              <Badge
                className={cn(
                  "text-sm",
                  isPaymentCaptured
                    ? "bg-success/20 text-success"
                    : "bg-muted/20 text-muted",
                )}
              >
                Student: {isPaymentCaptured ? "Paid" : "Unpaid"}
              </Badge>

              <Badge
                className={cn(
                  "text-sm",
                  bid.isPaidToHotel
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning",
                )}
              >
                Hotel: {bid.isPaidToHotel ? "Paid" : "Unpaid"}
              </Badge>

              {bid.paidToHotelAt && (
                <Badge variant="outline" className="text-muted border-line">
                  Paid on {format(new Date(bid.paidToHotelAt), "MMM d, yyyy")}
                </Badge>
              )}
            </div>

            {!canPayout && (
              <p className="text-sm text-warning flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Student payment must be completed before hotel payout can be
                processed
              </p>
            )}
          </div>

          {/* Payout Settings */}
          {canPayout && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-fg">Payout Method</Label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger className="bg-glass border-line text-fg">
                    <SelectValue placeholder="Select payout method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYOUT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border border-line rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-fg">Mark as Paid to Hotel</Label>
                  <p className="text-sm text-muted">
                    Toggle when you've sent the payout to the hotel
                  </p>
                </div>
                <Switch
                  checked={isPaidToHotel}
                  onCheckedChange={setIsPaidToHotel}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-fg">Payout Notes</Label>
                <Textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Add any notes about this payout (transaction ID, reference number, etc.)"
                  className="bg-glass border-line text-fg placeholder:text-muted"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {bid.payment?.stripePaymentIntentId && (
            <Button
              variant="outline"
              onClick={onOpenStripe}
              className="border-line text-fg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Stripe
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-line text-fg"
          >
            Cancel
          </Button>
          {canPayout && (
            <Button
              onClick={handleSave}
              disabled={updatePayout.isPending}
              className="btn-bid"
            >
              {updatePayout.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
