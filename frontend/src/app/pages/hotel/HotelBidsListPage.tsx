import { useHotel } from "../../../hooks/useHotel";
import { usePlaceSummary } from "../../../hooks/usePlaces";
import { MembersWhoBid } from "../../components/hotel/MembersWhoBid";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

// Model B: Deadline charges the guest the 7% booking fee; the hotel collects
// the remaining 93% of the room rate (plus taxes) at the front desk.
const HOTEL_SHARE = 0.93;

export function HotelBidsPage() {
  const { selectedHotelId } = useHotel();
  const { data: summary, isFetching: isLoading } = usePlaceSummary(
    selectedHotelId,
    90,
  );

  const totals = summary?.totals;
  const collectAtDesk = totals ? Math.round(totals.bookedRevenue * HOTEL_SHARE) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">
          Who's bidding
        </h1>
        <p className="text-muted mt-1 text-sm">
          Every verified member who bid on your listing — and what they offered.
          Last 90 days.
        </p>
      </div>

      {isLoading ? (
        <SkeletonLoader className="h-96 w-full" />
      ) : (
        <>
          {/* Model B summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-xl overflow-hidden border border-line">
            <div className="bg-bg p-4 sm:p-5">
              <p className="text-[11px] text-muted uppercase tracking-wider">
                Members who bid
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-fg">
                {totals?.bidders ?? 0}
              </p>
              <p className="text-xs text-muted">
                {totals?.bids ?? 0} bids total
              </p>
            </div>
            <div className="bg-bg p-4 sm:p-5">
              <p className="text-[11px] text-muted uppercase tracking-wider">
                Booked
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-success">
                {totals?.booked ?? 0}
              </p>
              <p className="text-xs text-muted">
                {totals?.conversionPct != null
                  ? `${totals.conversionPct}% of sessions`
                  : "—"}
              </p>
            </div>
            <div className="bg-bg p-4 sm:p-5">
              <p className="text-[11px] text-muted uppercase tracking-wider">
                You collect at check-in
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-fg">
                {money(collectAtDesk)}
              </p>
              <p className="text-xs text-muted">93% of booked room rate + tax</p>
            </div>
            <div className="bg-bg p-4 sm:p-5">
              <p className="text-[11px] text-muted uppercase tracking-wider">
                Bid range / night
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-fg">
                {summary?.bidPerNight
                  ? summary.bidPerNight.min === summary.bidPerNight.max
                    ? money(summary.bidPerNight.min)
                    : `${money(summary.bidPerNight.min)}–${money(
                        summary.bidPerNight.max,
                      )}`
                  : "—"}
              </p>
              <p className="text-xs text-muted">
                {summary?.bidPerNight
                  ? `avg ${money(summary.bidPerNight.avg)}`
                  : "no bids yet"}
              </p>
            </div>
          </div>

          <MembersWhoBid sessions={summary?.sessions ?? []} />
        </>
      )}
    </div>
  );
}
