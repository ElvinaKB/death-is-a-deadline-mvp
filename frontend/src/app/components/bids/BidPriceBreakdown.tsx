import { format } from "date-fns";
import { CalendarIcon, Moon } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { cn } from "../ui/utils";

export type BidPriceBreakdownSurface =
  | "listing"
  | "rows"
  | "compact"
  | "rejected";

export interface BidPriceBreakdownProps {
  bidPerNight: number;
  nights: number;
  totalAmount: number;
  checkIn?: Date;
  checkOut?: Date;
  className?: string;
  surface?: BidPriceBreakdownSurface;
  showTotalLabel?: boolean;
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bid-summary-row">
      <span className="bid-summary-row__label">{label}</span>
      <span className={cn("bid-summary-row__value", valueClassName)}>{value}</span>
    </div>
  );
}

export function BidPriceBreakdown({
  bidPerNight,
  nights,
  totalAmount,
  checkIn,
  checkOut,
  className,
  surface = "listing",
  showTotalLabel = true,
}: BidPriceBreakdownProps) {
  if (nights <= 0 || bidPerNight <= 0) {
    return null;
  }

  const totalLabel = showTotalLabel ? "Total if accepted" : "Total bid";
  const mathLine = (
    <>
      {formatCurrency(bidPerNight)}/night × {nights} night
      {nights !== 1 ? "s" : ""} = {formatCurrency(totalAmount)}
    </>
  );

  const rows = (
    <>
      <SummaryRow
        label="Bid per night"
        value={formatCurrency(bidPerNight)}
      />
      <SummaryRow
        label="Nights"
        value={`${nights} night${nights !== 1 ? "s" : ""}`}
      />
      <div className="bid-summary-total">
        <SummaryRow
          label={totalLabel}
          value={formatCurrency(totalAmount)}
          valueClassName="bid-summary-total__amount"
        />
      </div>
    </>
  );

  if (surface === "compact") {
    return (
      <p className={cn("bid-summary-compact", className)}>
        {formatCurrency(bidPerNight)}/night × {nights} night
        {nights !== 1 ? "s" : ""} ={" "}
        <span className="text-fg font-semibold tabular-nums">
          {formatCurrency(totalAmount)}
        </span>
      </p>
    );
  }

  if (surface === "rows") {
    return (
      <div className={cn("bid-summary-rows", className)} role="group" aria-label="Bid price breakdown">
        {rows}
        <p className="bid-summary-rows__math">{mathLine}</p>
      </div>
    );
  }

  const hasDates =
    checkIn instanceof Date &&
    !Number.isNaN(checkIn.getTime()) &&
    checkOut instanceof Date &&
    !Number.isNaN(checkOut.getTime());

  const shellClass =
    surface === "rejected"
      ? "listing-bid-summary listing-bid-summary--rejected"
      : "listing-bid-summary";

  return (
    <div
      className={cn(shellClass, className)}
      role="group"
      aria-label="Bid price breakdown"
    >
      <p className="listing-bid-summary__heading">Bid summary</p>

      {hasDates && surface === "listing" && (
        <div className="listing-bid-summary__dates">
          <p className="listing-bid-summary__date-line">
            <CalendarIcon className="h-4 w-4 text-gold shrink-0" aria-hidden />
            <span>
              {format(checkIn, "MMM d")} → {format(checkOut, "MMM d, yyyy")}
            </span>
          </p>
          <p className="listing-bid-summary__date-line">
            <Moon className="h-4 w-4 text-gold shrink-0" aria-hidden />
            <span>
              {nights} night{nights !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      )}

      <div className="listing-bid-summary__rows">{rows}</div>

      <p className="listing-bid-summary__math">{mathLine}</p>
    </div>
  );
}
