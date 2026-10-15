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
      <div className="rounded-xl border border-gold/40 bg-glass-2 p-4 text-center">
        <p className="text-lg font-bold text-gold">Bid your price below.</p>
        <p className="text-base text-fg mt-1">
          Log in to guess the price and win the room.
        </p>
      </div>
    );
  }
  if (!checkInDate || !checkOutDate) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-glass-2 p-4 text-base text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Checking today&apos;s price…
      </div>
    );
  }
  if (!quote?.available || !quote.bookNowPricePerNight) {
    return (
      <div
        role="alert"
        className="rounded-xl border-2 border-urgent bg-urgent/10 p-4 text-center shadow-[0_0_24px_hsl(var(--urgent)/0.35)]"
      >
        <p className="text-xl font-bold uppercase tracking-wide text-urgent">
          Sold out for these dates
        </p>
        <p className="text-base text-fg mt-1">Pick different dates to bid.</p>
      </div>
    );
  }

  const nights = quote.nights ?? 1;
  const perNight = quote.bookNowPricePerNight;
  const nonTaxFees = quote.payAtHotelNonTax ?? 0;
  const taxesAtHotel = Math.max(0, (quote.payAtHotel ?? 0) - nonTaxFees);
  // FTC Junk Fees Rule / CA SB 478: the most prominent price must include
  // mandatory non-tax fees (resort/service), even though the hotel collects
  // them at check-in. Government taxes may be disclosed separately.
  const displayPerNight = perNight + Math.ceil(nonTaxFees / nights);
  const displayTotal = quote.bookNowDisplayTotal ?? perNight * nights + nonTaxFees;

  return (
    <div className="rounded-xl border border-line bg-glass-2 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Public price
          </p>
          <p className="text-2xl font-bold text-fg leading-tight">
            {formatCurrency(displayPerNight)}
            <span className="text-base font-normal text-muted"> / night</span>
          </p>
        </div>
        <button
          type="button"
          className="btn-bid-premium shrink-0 h-12 rounded-lg px-5 text-sm font-semibold uppercase tracking-wide inline-flex items-center gap-2"
          onClick={() => onUseMemberPrice(perNight)}
        >
          <Zap className="h-4 w-4" /> Book now
        </button>
      </div>
      <p className="text-base text-muted leading-snug">
        {nights} night{nights === 1 ? "" : "s"} · {formatCurrency(displayTotal)} total
        {nonTaxFees > 0 &&
          ` (incl. ${formatCurrency(nonTaxFees)} hotel fee paid at check-in)`}
        {taxesAtHotel > 0 &&
          ` · + ${formatCurrency(taxesAtHotel)} local taxes at check-in`}
        <br />
        <span className="line-clamp-1">
          {quote.roomName}
          {quote.refundable ? " · Free cancellation" : " · Non-refundable"}
        </span>
      </p>
      <div className="rounded-lg bg-gold/10 border border-gold/40 px-3 py-2.5 text-center">
        <p className="text-lg font-bold text-gold">Bid your price below.</p>
        <p className="text-base text-fg">Guess the price, win the room.</p>
      </div>
    </div>
  );
}
