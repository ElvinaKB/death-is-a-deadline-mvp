import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Hourglass, Loader2, Lock, Shield, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { formatCurrency } from "../../../utils/currency";
import { Place } from "../../../types/place.types";

/** Seconds user must wait before confirming (review window). */
export const LOCK_IN_DURATION_SECONDS = 10;

interface BidLockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place;
  checkIn?: Date;
  checkOut?: Date;
  bidPerNight: number;
  totalAmount: number;
  auctionSeconds: number;
  onConfirm: () => void;
  onGoBack: () => void;
  isSubmitting?: boolean;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatLockInTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function BidLockInModal({
  open,
  onOpenChange,
  place,
  checkIn,
  checkOut,
  bidPerNight,
  totalAmount,
  onConfirm,
  onGoBack,
  isSubmitting,
}: BidLockInModalProps) {
  const [lockInSeconds, setLockInSeconds] = useState(LOCK_IN_DURATION_SECONDS);

  useEffect(() => {
    if (!open) {
      setLockInSeconds(LOCK_IN_DURATION_SECONDS);
      return;
    }

    setLockInSeconds(LOCK_IN_DURATION_SECONDS);
    const id = window.setInterval(() => {
      setLockInSeconds((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [open]);

  const hasValidDates =
    checkIn instanceof Date &&
    !Number.isNaN(checkIn.getTime()) &&
    checkOut instanceof Date &&
    !Number.isNaN(checkOut.getTime());

  const timerRunning = lockInSeconds > 0;
  const canPlaceBid = !timerRunning && !isSubmitting;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (!canPlaceBid || isSubmitting) return;
    onConfirm();
  };

  const handleGoBack = () => {
    if (isSubmitting) return;
    onGoBack();
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  if (!hasValidDates) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent isClose={false} className="max-w-lg bg-[#0a0a0a] border-line text-fg">
          <p className="text-sm text-muted text-center py-4">
            Select valid check-in and check-out dates before confirming your bid.
          </p>
          <Button type="button" className="w-full btn-outline-gold" onClick={handleGoBack}>
            Go back
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const retailTotal = place.retailPrice * nights;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        isClose={false}
        className="lock-in-modal lock-in-modal-shell max-w-md border-0 p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        {!isSubmitting && (
          <button
            type="button"
            onClick={handleGoBack}
            className="absolute right-4 top-4 z-10 cursor-pointer rounded-full p-1 text-muted hover:text-fg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="p-6 md:p-8 space-y-5">
          <p className="text-center text-xs font-semibold tracking-[0.25em] text-urgent uppercase">
            Final Bid
          </p>

          <div className="text-center">
            <p className="text-5xl md:text-6xl font-bold text-fg tracking-tight">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-sm text-muted mt-2">{place.name}</p>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-lg border border-urgent/50 bg-urgent/5 px-4 py-3 text-sm text-fg text-center">
            <Shield className="h-5 w-5 shrink-0 text-urgent" />
            <p>
              If the hotel accepts your bid, your reservation is instantly
              secured.
            </p>
          </div>

          <div className="lock-in-timer-row">
            <div className="flex items-center gap-2 text-urgent text-xs font-semibold tracking-[0.14em] uppercase">
              <Hourglass className="h-4 w-4" />
              Lock-in timer
            </div>
            <p
              className="lock-in-timer-digits"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatLockInTimer(lockInSeconds)}
            </p>
          </div>
          <p className="text-xs text-muted text-center">
            {isSubmitting
              ? "Please wait while we submit your bid and process payment."
              : timerRunning
                ? "Step away anytime until this hits zero."
                : "You can place your binding bid now."}
          </p>

          <div className="lock-in-listing-summary space-y-2.5 text-sm border-t border-line/50 pt-4">
            <p className="text-xs tracking-wider text-fg uppercase text-center">
              Listing summary
            </p>
            <div className="flex justify-between items-start gap-4 text-fg">
              <span>
                {format(checkIn, "MMM d")} → {format(checkOut, "MMM d")}
              </span>
              <span className="shrink-0 text-right">
                {nights} night{nights !== 1 ? "s" : ""}
              </span>
            </div>
            {bidPerNight > 0 && (
              <div className="flex justify-between items-start gap-4 text-fg">
                <span className="font-medium">
                  {formatCurrency(bidPerNight)}/night
                </span>
                <span className="shrink-0 text-right text-xs text-muted leading-snug">
                  {formatCurrency(bidPerNight)} × {nights}{" "}
                  {nights === 1 ? "night" : "nights"} ={" "}
                  <span className="font-medium text-fg">
                    {formatCurrency(totalAmount)}
                  </span>
                </span>
              </div>
            )}
            <div className="flex justify-between items-start gap-4 text-fg">
              <span>Retail reference</span>
              <span className="shrink-0 text-right text-xs text-muted leading-snug">
                {place.retailPrice > 0 ? (
                  <>
                    {formatCurrency(place.retailPrice)} × {nights}{" "}
                    {nights === 1 ? "night" : "nights"} ={" "}
                    <span className="font-medium text-fg">
                      {formatCurrency(retailTotal)}
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-fg">
                    {formatCurrency(retailTotal)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4 font-medium text-fg">
              <span>Your bid</span>
              <span className="shrink-0 text-right text-urgent">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full btn-bid-premium h-12 text-base uppercase tracking-wide text-black"
            onClick={handleConfirm}
            disabled={timerRunning || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing your bid…
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {timerRunning
                  ? `Confirm in ${formatLockInTimer(lockInSeconds)}`
                  : `Place ${formatCurrency(totalAmount)} Bid`}
              </>
            )}
          </Button>
          {!isSubmitting && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-fg/30 text-fg hover:bg-white/5 cursor-pointer"
              onClick={handleGoBack}
            >
              Go Back and Adjust
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
