import { Loader2, Zap } from "lucide-react";
import { useWholesaleQuote } from "../../../hooks/useWholesale";
import { formatCurrency } from "../../../utils/currency";

interface WholesalePricePanelProps {
  placeId: string;
  checkInDate?: string;
  checkOutDate?: string;
  isAuthenticated: boolean;
  /** Fill the bid box with the public price (then the normal bid flow books it). */
  onUseMemberPrice: (pricePerNight: number) => void;
}

/**
 * Wholesale hotels: "Book now" at the live public price (no game), and the
 * invitation to bid lower. The secret member price (Nuitee cost + margin) is
 * never sent to the browser — it's only revealed by the API after a few
 * losing bids. Every bid is recorded as demand data.
 */
export function WholesalePricePanel({
  placeId,
  checkInDate,
  checkOutDate,
  isAuthenticated,
  onUseMemberPrice,
}: WholesalePricePanelProps) {
  const { data: quote, isLoading } = useWholesaleQuote(
    placeId,
    checkInDate,
    checkOutDate,
    isAuthenticated,
  );

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-line bg-glass-2 p-4 text-sm text-muted">
        Log in to name your price — members win rooms below the public price.
      </div>
    );
  }
  if (!checkInDate || !checkOutDate) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-glass-2 p-4 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking member price…
      </div>
    );
  }
  if (!quote?.available || !quote.bookNowPricePerNight) {
    return (
      <div className="rounded-xl border border-line bg-glass-2 p-4 text-sm text-muted">
        Sold out for these dates — try other dates.
      </div>
    );
  }

  const nights = quote.nights ?? 1;
  const perNight = quote.bookNowPricePerNight!;
  const nonTaxFees = quote.payAtHotelNonTax ?? 0;
  const taxesAtHotel = Math.max(0, (quote.payAtHotel ?? 0) - nonTaxFees);
  // FTC Junk Fees Rule / CA SB 478: the most prominent price must include
  // mandatory non-tax fees (resort/service), even though the hotel collects
  // them at check-in. Government taxes may be disclosed separately.
  const displayPerNight = perNight + Math.ceil(nonTaxFees / nights);
  const displayTotal = quote.bookNowDisplayTotal ?? perNight * nights + nonTaxFees;

  return (
    <div className="rounded-xl border border-line bg-glass-2 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
          Book now · public price
        </p>
        <p className="text-2xl font-bold text-fg">
          {formatCurrency(displayPerNight)}
          <span className="text-sm font-normal text-muted"> / night</span>
        </p>
        <p className="text-xs text-muted mt-1">
          {nights} night{nights === 1 ? "" : "s"} · {formatCurrency(displayTotal)} total
          {nonTaxFees > 0 &&
            ` (${formatCurrency(perNight * nights)} now + ${formatCurrency(nonTaxFees)} hotel fee at check-in)`}
          {taxesAtHotel > 0 &&
            ` · + ${formatCurrency(taxesAtHotel)} local taxes at check-in`}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {quote.roomName}
          {quote.refundable ? " · Free cancellation" : " · Non-refundable"}
        </p>
      </div>
      <button
        type="button"
        className="h-10 w-full rounded-lg border border-line text-sm font-semibold uppercase tracking-wide text-fg hover:bg-glass inline-flex items-center justify-center gap-2"
        onClick={() => onUseMemberPrice(perNight)}
      >
        <Zap className="h-4 w-4" /> Book now at {formatCurrency(displayTotal)}
      </button>
      <div className="rounded-lg bg-gold/10 border border-gold/40 p-3 text-center">
        <p className="text-sm font-semibold text-gold">Members pay less — name your price below.</p>
        <p className="text-xs text-muted mt-0.5">
          Bid under the public price. Hit the secret member price and the room is yours.
        </p>
      </div>
    </div>
  );
}
