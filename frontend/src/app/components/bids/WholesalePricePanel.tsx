import { Loader2, Zap } from "lucide-react";
import { useWholesaleQuote } from "../../../hooks/useWholesale";
import { formatCurrency } from "../../../utils/currency";

interface WholesalePricePanelProps {
  placeId: string;
  checkInDate?: string;
  checkOutDate?: string;
  isAuthenticated: boolean;
  /** Fill the bid box with the member price (then the normal bid flow books it). */
  onUseMemberPrice: (pricePerNight: number) => void;
}

/**
 * "Book now" for wholesale hotels: the live members-only price, shown only to
 * logged-in members (closed user group). Members can still name a lower price
 * in the bid box — every bid is recorded as demand data — and after a few
 * misses the API reveals this price anyway.
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
        Log in to see tonight&apos;s member price — or name your own.
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
  if (!quote?.available || !quote.memberPricePerNight) {
    return (
      <div className="rounded-xl border border-line bg-glass-2 p-4 text-sm text-muted">
        Sold out for these dates — try other dates.
      </div>
    );
  }

  const nights = quote.nights ?? 1;
  const perNight = quote.memberPricePerNight;
  const nonTaxFees = quote.payAtHotelNonTax ?? 0;
  const taxesAtHotel = Math.max(0, (quote.payAtHotel ?? 0) - nonTaxFees);
  // FTC Junk Fees Rule / CA SB 478: the most prominent price must include
  // mandatory non-tax fees (resort/service), even though the hotel collects
  // them at check-in. Government taxes may be disclosed separately.
  const displayPerNight = perNight + Math.ceil(nonTaxFees / nights);
  const displayTotal = quote.displayTotal ?? perNight * nights + nonTaxFees;
  const showRetail =
    quote.retailPricePerNight != null &&
    quote.retailPricePerNight > displayPerNight;

  return (
    <div className="rounded-xl border border-gold/40 bg-glass-2 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Member price
          </p>
          <p className="text-2xl font-bold text-fg">
            {showRetail && (
              <span className="mr-2 text-base font-medium text-muted line-through">
                {formatCurrency(quote.retailPricePerNight!)}
              </span>
            )}
            {formatCurrency(displayPerNight)}
            <span className="text-sm font-normal text-muted"> / night</span>
          </p>
          <p className="text-xs text-muted mt-1">
            {nights} night{nights === 1 ? "" : "s"} ·{" "}
            {formatCurrency(displayTotal)} total
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
      </div>
      <button
        type="button"
        className="listing-card-bid-btn h-11 w-full rounded-lg text-sm uppercase inline-flex items-center justify-center gap-2"
        onClick={() => onUseMemberPrice(perNight)}
      >
        <Zap className="h-4 w-4" /> Book now · {formatCurrency(displayTotal)} total
      </button>
      <p className="text-xs text-muted text-center">
        Or name your price below — if it&apos;s high enough, it&apos;s yours.
      </p>
    </div>
  );
}
