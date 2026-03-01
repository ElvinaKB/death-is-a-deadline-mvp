import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  User,
  Calendar,
  Hash,
  Building2,
  Printer,
} from "lucide-react";
import { Bid } from "../../../types/bid.types";
import { cn } from "../ui/utils";

interface HotelBidInvoiceModalProps {
  bid: Bid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

function StatusDot({ captured }: { captured: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        captured ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
      )}
    >
      {captured ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      {captured ? "Confirmed" : "Pending"}
    </span>
  );
}

export function HotelBidInvoiceModal({
  bid,
  open,
  onOpenChange,
}: HotelBidInvoiceModalProps) {
  if (!bid) return null;

  const isStudentPaid = bid.payment?.status === "CAPTURED";
  const isHotelPaid = bid.isPaidToHotel;

  const commissionRate =
    bid.totalAmount && bid.platformCommission
      ? ((bid.platformCommission / bid.totalAmount) * 100).toFixed(2)
      : "6.66";

  const invoiceNumber = `INV-${bid.id.slice(0, 8).toUpperCase()}`;
  const createdDate = format(new Date(bid.createdAt), "MMMM d, yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-bg border-line p-0">
        {/* Invoice header band */}
        <div className="bg-brand/10 border-b border-brand/20 px-5 sm:px-7 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand font-semibold mb-1">
                Booking Invoice
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-fg">
                {invoiceNumber}
              </h2>
              <p className="text-xs text-muted mt-1">Issued {createdDate}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted mb-1">Status</p>
              <Badge
                className={cn(
                  "text-xs",
                  bid.status === "ACCEPTED"
                    ? "bg-success/20 text-success"
                    : bid.status === "PENDING"
                      ? "bg-warning/20 text-warning"
                      : "bg-danger/20 text-danger",
                )}
              >
                {bid.status.charAt(0) + bid.status.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-7 py-5 space-y-5">
          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hotel */}
            <div className="glass rounded-lg p-4 border border-line space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Your Property
              </p>
              <p className="font-semibold text-fg text-sm">
                {bid.place?.name || "N/A"}
              </p>
              {bid.place?.city && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {bid.place.city}, {bid.place.country}
                </p>
              )}
              {bid.place?.email && (
                <p className="text-xs text-muted">{bid.place.email}</p>
              )}
            </div>

            {/* Student */}
            <div className="glass rounded-lg p-4 border border-line space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Guest
              </p>
              <p className="font-semibold text-fg text-sm">
                {bid.student?.name || "N/A"}
              </p>
              {bid.student?.email && (
                <p className="text-xs text-muted">{bid.student.email}</p>
              )}
            </div>
          </div>

          {/* Stay details */}
          <div className="glass rounded-lg border border-line overflow-hidden">
            <div className="bg-glass px-4 py-2.5 border-b border-line">
              <p className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Stay Details
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line">
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-muted mb-1">Check-in</p>
                <p className="text-sm font-medium text-fg">
                  {format(new Date(bid.checkInDate), "MMM d")}
                </p>
                <p className="text-xs text-muted">
                  {format(new Date(bid.checkInDate), "yyyy")}
                </p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-muted mb-1">Check-out</p>
                <p className="text-sm font-medium text-fg">
                  {format(new Date(bid.checkOutDate), "MMM d")}
                </p>
                <p className="text-xs text-muted">
                  {format(new Date(bid.checkOutDate), "yyyy")}
                </p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-muted mb-1">Duration</p>
                <p className="text-sm font-medium text-fg">{bid.totalNights}</p>
                <p className="text-xs text-muted">nights</p>
              </div>
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="glass rounded-lg border border-line overflow-hidden">
            <div className="bg-glass px-4 py-2.5 border-b border-line">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Financial Breakdown
              </p>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted">
                  {bid.totalNights} nights × {formatCurrency(bid.bidPerNight)}
                </span>
                <span className="font-medium text-fg">
                  {formatCurrency(bid.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-warning">
                <span>Platform fee ({commissionRate}%)</span>
                <span>− {formatCurrency(bid.platformCommission)}</span>
              </div>
              <div className="border-t border-line pt-2.5 flex justify-between items-center">
                <span className="font-semibold text-fg text-base">
                  Your Payout
                </span>
                <span className="font-bold text-success text-lg">
                  {formatCurrency(bid.payableToHotel)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          <div className="glass rounded-lg border border-line overflow-hidden">
            <div className="bg-glass px-4 py-2.5 border-b border-line">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Payment Status
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fg">Student Payment</p>
                  <p className="text-xs text-muted">
                    Payment from guest to platform
                  </p>
                </div>
                <StatusDot captured={isStudentPaid} />
              </div>
              <div className="border-t border-line pt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fg">Your Payout</p>
                  <p className="text-xs text-muted">
                    Transfer from platform to you
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                    isHotelPaid
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning",
                  )}
                >
                  {isHotelPaid ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {isHotelPaid ? "Received" : "Awaiting"}
                </span>
              </div>
              {bid.paidToHotelAt && (
                <p className="text-xs text-muted pt-0.5">
                  Payout received on{" "}
                  {format(new Date(bid.paidToHotelAt), "MMMM d, yyyy")}
                </p>
              )}
              {bid.payoutMethod && (
                <p className="text-xs text-muted">
                  Method:{" "}
                  <span className="text-fg font-medium">
                    {bid.payoutMethod}
                  </span>
                </p>
              )}
              {bid.payoutNotes && (
                <div className="bg-glass rounded-md px-3 py-2 text-xs text-muted border border-line">
                  <span className="font-medium text-fg">Note: </span>
                  {bid.payoutNotes}
                </div>
              )}
            </div>
          </div>

          {bid.status === "REJECTED" && bid.rejectionReason && (
            <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Rejection reason:</strong> {bid.rejectionReason}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-line flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-line text-fg hover:bg-glass"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
