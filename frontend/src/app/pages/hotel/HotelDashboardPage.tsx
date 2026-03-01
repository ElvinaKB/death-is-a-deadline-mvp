import { Card, CardContent } from "../../components/ui/card";
import {
  BedDouble,
  BookOpen,
  CalendarCheck,
  CalendarX,
  Clock,
  DollarSign,
  Landmark,
  TrendingUp,
  Building2,
  CheckCircle,
} from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";
import { useHotel } from "../../../hooks/useHotel";

interface PropertyStat {
  propertyName: string;
  city: string;
  confirmedBookings: number;
  pendingBookings: number;
  totalNights: number;
  revenue: number;
  payableToHotel: number;
}

interface HotelDashboardStats {
  // Earnings
  totalRevenue: number; // sum of totalAmount across confirmed bookings
  totalPayable: number; // sum of payableToHotel
  totalPaidOut: number; // sum of payableToHotel where isPaidToHotel = true
  totalPending: number; // totalPayable - totalPaidOut

  // Bookings
  totalConfirmed: number; // ACCEPTED + payment CAPTURED
  totalPendingBids: number; // PENDING bids awaiting decision
  totalRejected: number; // REJECTED bids
  totalNightsBooked: number;

  // Properties
  totalProperties: number;
  liveProperties: number;

  // Per-property breakdown
  propertyStats: PropertyStat[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function HotelDashboardPage() {
  const { selectedHotelId } = useHotel();

  const user = useAppSelector((state) => state.auth.user);

  const { data: stats, isFetching: isLoading } =
    useApiQuery<HotelDashboardStats>({
      queryKey: [QUERY_KEYS.HOTEL_DASHBOARD_STATS, selectedHotelId],
      endpoint: ENDPOINTS.HOTEL_DASHBOARD_STATS, // GET /hotel/dashboard/stats
      params: { placeId: selectedHotelId },
    });

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <SkeletonLoader className="h-8 w-48 mb-2" />
          <SkeletonLoader className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line rounded-xl overflow-hidden border border-line mb-8">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
      </div>
    );
  }

  const confirmedPct =
    stats?.totalConfirmed &&
    stats.totalConfirmed + stats.totalPendingBids + stats.totalRejected
      ? Math.round(
          (stats.totalConfirmed /
            (stats.totalConfirmed +
              stats.totalPendingBids +
              stats.totalRejected)) *
            100,
        )
      : 0;

  const paidOutPct = stats?.totalPayable
    ? Math.round(((stats.totalPaidOut ?? 0) / stats.totalPayable) * 100)
    : 0;

  const maxRevenue = stats?.propertyStats?.length
    ? Math.max(...stats.propertyStats.map((p) => p.revenue))
    : 1;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted mt-1 text-sm">
          Here's how your properties are performing
        </p>
      </div>

      {/* ── EARNINGS: Hero strip ── */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
          Earnings
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-xl overflow-hidden border border-line">
          <div className="bg-bg p-5 sm:p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <DollarSign className="h-3.5 w-3.5" />
              Total Earned (Gross)
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">
              {formatCurrency(stats?.totalRevenue ?? 0)}
            </span>
            <span className="text-xs text-muted mt-1">
              From all confirmed bookings
            </span>
          </div>

          <div className="bg-bg p-5 sm:p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <CheckCircle className="h-3.5 w-3.5" />
              Your Net Payout
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-success tracking-tight">
              {formatCurrency(stats?.totalPayable ?? 0)}
            </span>
            <span className="text-xs text-muted mt-1">
              After platform commission
            </span>
          </div>

          <div className="bg-bg p-5 sm:p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <Landmark className="h-3.5 w-3.5" />
              Awaiting Payout
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-warning tracking-tight">
              {formatCurrency(stats?.totalPending ?? 0)}
            </span>
            <div className="mt-2 flex items-center gap-2">
              {/* Paid out progress bar */}
              <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${paidOutPct}%` }}
                />
              </div>
              <span className="text-xs text-muted shrink-0">
                {paidOutPct}% paid out
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOOKING STATS + PROPERTIES: Side by side ── */}
      <section className="flex flex-col md:flex-row w-full gap-6">
        {/* Booking activity */}
        <div className="w-full">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
            Booking Activity
          </p>
          <Card className="bg-glass-2 border-line h-full">
            <CardContent className="pt-6 space-y-5">
              {/* Big confirmed number */}
              <div className="flex items-end justify-between border-b border-line pb-4">
                <div>
                  <p className="text-muted text-xs mb-1">Confirmed Bookings</p>
                  <p className="text-5xl font-bold text-fg">
                    {(stats?.totalConfirmed ?? 0).toLocaleString()}
                  </p>
                </div>
                <BookOpen className="h-10 w-10 text-brand/30" />
              </div>

              {/* Stacked bar */}
              <div>
                <div className="flex h-2 rounded-full overflow-hidden gap-px bg-line">
                  <div
                    className="bg-success transition-all duration-700"
                    style={{ width: `${confirmedPct}%` }}
                  />
                  <div
                    className="bg-warning transition-all duration-700"
                    style={{
                      width: `${
                        stats?.totalConfirmed &&
                        stats.totalConfirmed +
                          stats.totalPendingBids +
                          stats.totalRejected
                          ? Math.round(
                              (stats.totalPendingBids /
                                (stats.totalConfirmed +
                                  stats.totalPendingBids +
                                  stats.totalRejected)) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                  <div
                    className="bg-danger transition-all duration-700"
                    style={{
                      width: `${
                        stats?.totalConfirmed &&
                        stats.totalConfirmed +
                          stats.totalPendingBids +
                          stats.totalRejected
                          ? Math.round(
                              (stats.totalRejected /
                                (stats.totalConfirmed +
                                  stats.totalPendingBids +
                                  stats.totalRejected)) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Rows */}
              {[
                {
                  label: "Confirmed",
                  value: stats?.totalConfirmed ?? 0,
                  icon: CalendarCheck,
                  color: "bg-success",
                  textColor: "text-success",
                },
                {
                  label: "Pending Review",
                  value: stats?.totalPendingBids ?? 0,
                  icon: Clock,
                  color: "bg-warning",
                  textColor: "text-warning",
                },
                {
                  label: "Rejected",
                  value: stats?.totalRejected ?? 0,
                  icon: CalendarX,
                  color: "bg-danger",
                  textColor: "text-danger",
                },
              ].map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${row.color}`} />
                      <Icon className={`h-3.5 w-3.5 ${row.textColor}`} />
                      <span className="text-sm text-muted">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-fg">
                      {row.value.toLocaleString()}
                    </span>
                  </div>
                );
              })}

              {/* Nights booked */}
              <div className="border-t border-line pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted" />
                  <span className="text-sm text-muted">
                    Total Nights Booked
                  </span>
                </div>
                <span className="text-sm font-bold text-fg">
                  {(stats?.totalNightsBooked ?? 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties overview */}
        <div className="w-full">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
            Properties
          </p>
          <Card className="bg-glass-2 border-line h-full">
            <CardContent className="pt-6 space-y-5">
              {/* Property counts */}
              <div className="flex items-end justify-between border-b border-line pb-4">
                <div>
                  <p className="text-muted text-xs mb-1">Total Properties</p>
                  <p className="text-5xl font-bold text-fg">
                    {(stats?.totalProperties ?? 0).toLocaleString()}
                  </p>
                </div>
                <Building2 className="h-10 w-10 text-brand/30" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-muted">Live</span>
                </div>
                <span className="text-sm font-semibold text-success">
                  {stats?.liveProperties ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span className="text-sm text-muted">Draft / Paused</span>
                </div>
                <span className="text-sm font-semibold text-muted">
                  {(stats?.totalProperties ?? 0) - (stats?.liveProperties ?? 0)}
                </span>
              </div>

              {/* Per-property revenue bars */}
              {stats?.propertyStats && stats.propertyStats.length > 0 && (
                <div className="border-t border-line pt-4 space-y-4">
                  <p className="text-xs text-muted uppercase tracking-wider">
                    Revenue by property
                  </p>
                  {stats.propertyStats.map((prop, index) => {
                    const barWidth = Math.round(
                      (prop.revenue / maxRevenue) * 100,
                    );
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-fg text-xs truncate">
                              {prop.propertyName}
                            </p>
                            <p className="text-xs text-muted">
                              {prop.city} · {prop.confirmedBookings} booking
                              {prop.confirmedBookings !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="font-semibold text-fg text-xs shrink-0 ml-3">
                            {formatCurrency(prop.revenue)}
                          </span>
                        </div>
                        <div className="h-1 bg-line rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand/60 rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2">
                <Link
                  to={ROUTES.HOTEL_PLACES}
                  className="text-xs text-brand hover:underline"
                >
                  Manage all properties →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── PENDING BIDS CTA ── */}
      {(stats?.totalPendingBids ?? 0) > 0 && (
        <section>
          <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-fg">
                  {stats!.totalPendingBids} pending bid
                  {stats!.totalPendingBids !== 1 ? "s" : ""} awaiting action
                </p>
                <p className="text-xs text-muted">
                  Review and respond to keep your acceptance rate healthy
                </p>
              </div>
            </div>
            <Link
              to={ROUTES.HOTEL_BIDS}
              className="text-xs font-semibold text-warning border border-warning/30 px-3 py-1.5 rounded-md hover:bg-warning/10 transition-colors shrink-0"
            >
              View Bids →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
