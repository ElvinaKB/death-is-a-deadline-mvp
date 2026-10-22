import type { ReactNode } from "react";
import { PlaceSummary } from "../../../types/placeSummary.types";

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="bg-bg p-4 sm:p-5 flex flex-col gap-1">
      <p className="text-[11px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">
        {value}
      </p>
      {sub != null && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; bids: number; avgBid: number | null }[];
}) {
  return (
    <div className="bg-glass-2 border border-line rounded-xl p-4 sm:p-5">
      <p className="text-xs text-muted uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted">{r.label}</span>
            <span className="text-fg tabular-nums">
              {r.bids === 0 ? (
                <span className="text-muted">0 bids</span>
              ) : (
                <>
                  {r.bids} bid{r.bids === 1 ? "" : "s"}
                  {r.avgBid != null && (
                    <span className="text-muted"> · avg {money(r.avgBid)}</span>
                  )}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HotelDemandOverview({ summary }: { summary: PlaceSummary }) {
  const { totals, bidPerNight, bestFinalUnbooked, place } = summary;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest">
          Demand &amp; willingness to pay
        </p>
        <p className="text-xs text-muted">Last {summary.days} days</p>
      </div>

      {/* Headline pitch */}
      {summary.pitch ? (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 sm:p-5">
          <p className="text-sm sm:text-base text-fg leading-relaxed">
            {summary.pitch}
          </p>
          <p className="text-xs text-muted mt-2">
            Members bid real money against your hidden floor. Use this to set a
            price that captures demand — you collect 93% + taxes at the desk.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-glass-2 p-4 sm:p-5">
          <p className="text-sm text-muted">
            No bids yet in this window. Once members start bidding on your
            listing, their offers and willingness-to-pay show up here.
          </p>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-xl overflow-hidden border border-line">
        <Tile
          label="Bids"
          value={totals.bids}
          sub={`${totals.bidders} member${totals.bidders === 1 ? "" : "s"}`}
        />
        <Tile
          label="Booked"
          value={totals.booked}
          sub={
            totals.conversionPct != null
              ? `${totals.conversionPct}% of sessions`
              : "—"
          }
        />
        <Tile
          label="Walked away"
          value={totals.walkedAway}
          sub="left without booking"
        />
        <Tile
          label="Listing views"
          value={totals.views}
          sub={`${totals.uniqueViewers} member${
            totals.uniqueViewers === 1 ? "" : "s"
          }`}
        />
        <Tile
          label="Bid range / night"
          value={
            bidPerNight
              ? bidPerNight.min === bidPerNight.max
                ? money(bidPerNight.min)
                : `${money(bidPerNight.min)}–${money(bidPerNight.max)}`
              : "—"
          }
          sub={bidPerNight ? `avg ${money(bidPerNight.avg)}` : undefined}
        />
        <Tile
          label="Best & final (unbooked)"
          value={
            bestFinalUnbooked
              ? bestFinalUnbooked.min === bestFinalUnbooked.max
                ? money(bestFinalUnbooked.min)
                : `${money(bestFinalUnbooked.min)}–${money(
                    bestFinalUnbooked.max,
                  )}`
              : "—"
          }
          sub={
            bestFinalUnbooked
              ? `avg ${money(bestFinalUnbooked.avg)}`
              : "no walk-aways"
          }
        />
        <Tile
          label="Retail anchor"
          value={money(place.retailPrice)}
          sub="your public rate"
        />
        <Tile
          label="Room revenue booked"
          value={money(totals.bookedRevenue)}
          sub="collected at the desk"
        />
      </div>

      {/* Lead time + weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Breakdown title="When they bid (lead time)" rows={summary.byLeadTime} />
        <Breakdown title="By night of week" rows={summary.byWeekday} />
      </div>
    </section>
  );
}
