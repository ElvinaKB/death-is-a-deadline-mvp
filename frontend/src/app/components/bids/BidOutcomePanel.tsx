import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  Search,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { formatCurrency } from "../../../utils/currency";
import { BidPriceBreakdown } from "./BidPriceBreakdown";
import { Place } from "../../../types/place.types";
import { BidStatus } from "../../../types/bid.types";
import { ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";

const QUICK_BID_INCREMENTS = [25, 30, 35] as const;

interface BidOutcomePanelProps {
  status: BidStatus;
  place: Place;
  checkIn: Date;
  checkOut: Date;
  bidPerNight: number;
  totalAmount: number;
  onTryAgain: () => void;
  onTryNewDates?: () => void;
  onRebid?: (newBidPerNight: number) => void;
  isRebidding?: boolean;
  isProcessingBid?: boolean;
}

export function BidOutcomePanel({
  status,
  place,
  checkIn,
  checkOut,
  bidPerNight,
  totalAmount,
  onTryAgain,
  onTryNewDates: _onTryNewDates,
  onRebid,
  isRebidding,
  isProcessingBid,
}: BidOutcomePanelProps) {
  const isBusy = isRebidding || isProcessingBid;
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [adjustBid, setAdjustBid] = useState(true);
  const [selectedIncrement, setSelectedIncrement] = useState<number>(25);
  const previousBid = bidPerNight;
  const [newBidInput, setNewBidInput] = useState(String(bidPerNight));

  useEffect(() => {
    setNewBidInput(String(bidPerNight));
  }, [bidPerNight]);

  const applyQuickIncrement = (inc: number) => {
    setSelectedIncrement(inc);
    setNewBidInput(String(previousBid + inc));
  };

  const newBidPerNight = Math.max(1, Number(newBidInput) || 0);
  const newTotal = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
  ) * newBidPerNight;

  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const isAccepted = status === BidStatus.ACCEPTED;
  const userEmail = user?.email ?? "your email";

  if (isAccepted) {
    return (
      <div className="outcome-panel outcome-panel--accepted rounded-xl p-5 space-y-5 bg-[hsl(0_0%_4%)]">
        <div className="text-center pt-2 relative">
          <div className="outcome-confetti outcome-confetti--gold" aria-hidden />
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-fg">You&apos;re All Set!</h2>
          <p className="text-sm text-muted mt-1">Your bid was accepted.</p>
        </div>

        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            Reservation Confirmed
          </p>
          <p className="text-xs text-muted mt-1">Your room is secured.</p>
        </div>

        <div className="space-y-2 text-sm border-t border-line/60 pt-4">
          <div className="flex justify-between text-muted">
            <span>Check-in</span>
            <span className="text-fg">{format(checkIn, "EEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Check-out</span>
            <span className="text-fg">{format(checkOut, "EEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Nights</span>
            <span className="text-fg">
              {nights} night{nights !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Your Bid</span>
            <span className="text-fg">{formatCurrency(bidPerNight)}/night</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-line/60 font-semibold text-fg text-base">
            <span>Total Paid</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line/60 bg-bg/50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <CreditCard className="h-4 w-4" />
            <span className="text-fg">Card charged</span>
          </div>
          <span className="text-xs font-medium text-emerald-400 border border-emerald-500/50 rounded px-2 py-0.5">
            Paid
          </span>
        </div>

        <div className="rounded-lg border border-line/60 bg-bg/30 px-3 py-3 text-sm">
          <p className="font-medium text-emerald-400 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Confirmation Sent
          </p>
          <p className="text-xs text-muted mt-1">
            We&apos;ve sent the details to {userEmail}.
          </p>
        </div>

        <Button
          className="w-full btn-bid h-11"
          onClick={() => navigate(ROUTES.STUDENT_MY_BIDS)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          View My Booking
        </Button>
        <Button
          variant="outline"
          className="w-full border-line text-fg hover:bg-glass"
          onClick={() => navigate(ROUTES.HOME)}
        >
          <Search className="mr-2 h-4 w-4" />
          Keep Exploring
        </Button>
      </div>
    );
  }

  return (
    <div className="outcome-panel outcome-panel--rejected rounded-xl px-4 py-3 space-y-3.5 bg-[hsl(0_0%_4%)]">
      <div className="outcome-rejected-status text-center relative">
        <div className="outcome-confetti outcome-confetti--red" aria-hidden />
        <div className="outcome-rejected-icon mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-urgent">
          <X className="h-9 w-9 text-white stroke-[3]" aria-hidden />
        </div>
        <h2 className="outcome-rejected-title">NOT ACCEPTED</h2>
        <p className="outcome-rejected-subtitle">
          This bid didn&apos;t meet the hotel&apos;s hidden threshold.
        </p>
      </div>

      <div className="border-t border-line/40" role="presentation" />

      <div className="outcome-rejected-instructions space-y-1 text-center">
        <p className="text-base font-bold text-white">
          Adjust your bid and try again.
        </p>
        <p className="outcome-rejected-hint text-sm leading-relaxed">
          Try another amount or use Quick Bid options below.
        </p>
      </div>

      <div className="outcome-rejected-bid-field">
        <p className="outcome-rejected-bid-label">Your bid per night (USD)</p>
        <div className="outcome-rejected-input listing-bid-amount-box">
          <span className="outcome-rejected-currency" aria-hidden>
            $
          </span>
          <Input
            type="number"
            min={1}
            step={1}
            value={newBidInput}
            disabled={!adjustBid || isBusy}
            onChange={(e) => setNewBidInput(e.target.value)}
            className="outcome-rejected-amount-input border-0 bg-transparent shadow-none disabled:opacity-60"
            aria-label="Bid amount per night in US dollars"
          />
        </div>
      </div>

      {adjustBid && newBidPerNight > 0 && nights > 0 && (
        <BidPriceBreakdown
          surface="rejected"
          bidPerNight={newBidPerNight}
          nights={nights}
          totalAmount={newTotal}
        />
      )}

      <label className="outcome-rejected-checkbox flex items-center gap-3 cursor-pointer">
        <Checkbox
          checked={adjustBid}
          disabled={isBusy}
          onCheckedChange={(v) => setAdjustBid(v === true)}
          className="border-urgent data-[state=checked]:bg-urgent data-[state=checked]:border-urgent"
        />
        <span className="text-sm text-white">
          I want to adjust my bid and try again
        </span>
      </label>

      {adjustBid && (
        <div className="outcome-rejected-quick-bids space-y-2">
          <p className="outcome-rejected-quick-label">Quick bid options</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_BID_INCREMENTS.map((inc) => (
              <button
                key={inc}
                type="button"
                disabled={isBusy}
                onClick={() => applyQuickIncrement(inc)}
                className={`cursor-pointer rounded-lg border py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none ${
                  selectedIncrement === inc
                    ? "border-gold bg-gold/15 text-gold shadow-[0_0_16px_hsl(var(--gold)/0.35)]"
                    : "border-urgent/40 text-fg hover:border-urgent/70"
                }`}
              >
                + ${inc}
              </button>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="listing-pay-card flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <CreditCard className="h-3.5 w-3.5" />
            Payment method saved
          </span>
          <span className="text-muted border border-line/60 rounded px-1.5 py-0.5 text-[10px] font-medium">
            Not charged
          </span>
        </div>
      )}

      <Button
        className="w-full btn-bid-premium h-12 uppercase tracking-wide"
        disabled={!adjustBid || isBusy || newBidPerNight <= 0}
        onClick={() => onRebid?.(newBidPerNight)}
        aria-busy={isBusy}
      >
        {isBusy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Processing your bid…
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" aria-hidden />
            {`Place ${formatCurrency(newTotal)} Bid`}
          </>
        )}
      </Button>
      <p className="text-xs text-center text-muted">
        <span className="inline-flex items-center gap-1">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Secure payment · You won&apos;t be charged unless accepted
        </span>
      </p>

      <Button
        type="button"
        variant="outline"
        className="w-full btn-outline-gold"
        disabled={isBusy}
        onClick={() => navigate(ROUTES.HOME)}
      >
        Return to Marketplace
      </Button>
    </div>
  );
}
