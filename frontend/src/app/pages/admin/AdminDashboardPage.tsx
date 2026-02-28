import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Users,
  UserCheck,
  Clock,
  XCircle,
  Building2,
  BookOpen,
  BedDouble,
  Landmark,
  Trophy,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { ROUTES } from "../../../config/routes.config";
import { Link } from "react-router-dom";

interface TopProperty {
  propertyName: string;
  city: string;
  bookings: number;
  revenue: number;
}

interface DashboardStats {
  totalStudents: number;
  approvedStudents: number;
  pendingStudents: number;
  rejectedStudents: number;
  totalHotels: number;
  totalBookings: number;
  totalRevenue: number;
  platformCommission: number;
  totalPaidToHotels: number;
  totalNightsBooked: number;
  topProperties: TopProperty[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useApiQuery<DashboardStats>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, "stats"],
    endpoint: `${ENDPOINTS.STUDENTS_STATS}`,
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-fg mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
      </div>
    );
  }

  const totalStudents = stats?.totalStudents || 0;
  const approved = stats?.approvedStudents || 0;
  const pending = stats?.pendingStudents || 0;
  const rejected = stats?.rejectedStudents || 0;

  const approvedPct = totalStudents
    ? Math.round((approved / totalStudents) * 100)
    : 0;
  const pendingPct = totalStudents
    ? Math.round((pending / totalStudents) * 100)
    : 0;
  const rejectedPct = totalStudents
    ? Math.round((rejected / totalStudents) * 100)
    : 0;

  const topProperties = stats?.topProperties || [];
  const maxRevenue = topProperties.length
    ? Math.max(...topProperties.map((p) => p.revenue))
    : 1;

  const commissionPct =
    stats?.totalRevenue && stats?.platformCommission
      ? ((stats.platformCommission / stats.totalRevenue) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-fg">Dashboard</h1>
        <p className="text-muted mt-1">Platform overview</p>
      </div>

      {/* ── REVENUE: Hero strip ── */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
          Revenue
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line rounded-xl overflow-hidden border border-line">
          {/* Total Revenue */}
          <div className="bg-bg p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <DollarSign className="h-3.5 w-3.5" />
              Total Revenue
            </div>
            <span className="text-4xl font-bold text-fg tracking-tight">
              {formatCurrency(stats?.totalRevenue || 0)}
            </span>
            <span className="text-xs text-muted mt-1">
              All accepted bookings
            </span>
          </div>

          {/* Platform Commission */}
          <div className="bg-bg p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              Platform Commission
            </div>
            <span className="text-4xl font-bold text-warning tracking-tight">
              {formatCurrency(stats?.platformCommission || 0)}
            </span>
            <span className="text-xs text-muted mt-1">
              {commissionPct}% of total revenue
            </span>
          </div>

          {/* Paid to Hotels */}
          <div className="bg-bg p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted text-xs mb-3">
              <Landmark className="h-3.5 w-3.5" />
              Paid to Hotels
            </div>
            <span className="text-4xl font-bold text-success tracking-tight">
              {formatCurrency(stats?.totalPaidToHotels || 0)}
            </span>
            <span className="text-xs text-muted mt-1">Disbursed so far</span>
          </div>
        </div>
      </section>

      {/* ── BOOKINGS: Single wide stat bar with dividers ── */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
          Bookings & Properties
        </p>
        <div className="bg-glass-2 border border-line rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line">
            {[
              {
                label: "Total Bookings",
                value: stats?.totalBookings || 0,
                icon: BookOpen,
                suffix: "bookings",
              },
              {
                label: "Total Hotels",
                value: stats?.totalHotels || 0,
                icon: Building2,
                suffix: "properties",
              },
              {
                label: "Nights Booked",
                value: stats?.totalNightsBooked || 0,
                icon: BedDouble,
                suffix: "nights",
              },
              {
                label: "Avg Nights / Booking",
                value: stats?.totalBookings
                  ? Math.round(
                      (stats.totalNightsBooked || 0) / stats.totalBookings,
                    )
                  : 0,
                icon: Clock,
                suffix: "avg nights",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-4 px-6 gap-1 text-center"
                >
                  <Icon className="h-4 w-4 text-muted mb-1" />
                  <span className="text-3xl font-bold text-fg">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STUDENTS + TOP PROPERTIES: Side by side ── */}
      <section className="flex flex-col md:flex-row w-full gap-6">
        {/* Students: stacked breakdown with ratio bars */}
        <div className="w-full">
          <p className=" text-xs font-semibold text-muted uppercase tracking-widest mb-4">
            Students
          </p>
          <Card className="bg-glass-2 border-line h-full">
            <CardContent className="pt-6 space-y-5">
              {/* Total big number */}
              <div className="flex items-end justify-between border-b border-line pb-4">
                <div>
                  <p className="text-muted text-xs mb-1">Total Registered</p>
                  <p className="text-5xl font-bold text-fg">
                    {totalStudents.toLocaleString()}
                  </p>
                </div>
                <Users className="h-10 w-10 text-brand/30" />
              </div>

              {/* Stacked bar */}
              <div>
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-line">
                  <div
                    className="bg-success transition-all duration-700"
                    style={{ width: `${approvedPct}%` }}
                  />
                  <div
                    className="bg-warning transition-all duration-700"
                    style={{ width: `${pendingPct}%` }}
                  />
                  <div
                    className="bg-danger transition-all duration-700"
                    style={{ width: `${rejectedPct}%` }}
                  />
                </div>
              </div>

              {/* Breakdown rows */}
              {[
                {
                  label: "Approved",
                  value: approved,
                  pct: approvedPct,
                  color: "bg-success",
                  textColor: "text-success",
                  icon: UserCheck,
                },
                {
                  label: "Pending",
                  value: pending,
                  pct: pendingPct,
                  color: "bg-warning",
                  textColor: "text-warning",
                  icon: Clock,
                },
                {
                  label: "Rejected",
                  value: rejected,
                  pct: rejectedPct,
                  color: "bg-danger",
                  textColor: "text-danger",
                  icon: XCircle,
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
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-fg">
                        {row.value.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-medium w-10 text-right ${row.textColor}`}
                      >
                        {row.pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Top Properties: ranked list with inline revenue bars */}
        <div className="w-full">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Top Properties by Revenue
          </p>
          <Card className="bg-glass-2 border-line h-full">
            <CardContent className="pt-6">
              {!topProperties.length ? (
                <p className="text-muted text-sm text-center py-8">
                  No booking data yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {topProperties.map((prop, index) => {
                    const barWidth = Math.round(
                      (prop.revenue / maxRevenue) * 100,
                    );
                    const rankColors = [
                      "text-yellow-400",
                      "text-slate-400",
                      "text-orange-700",
                    ];
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs font-bold w-5 shrink-0 ${rankColors[index] ?? "text-muted/40"}`}
                            >
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-fg truncate">
                                {prop.propertyName}
                              </p>
                              <p className="text-xs text-muted">
                                {prop.city} · {prop.bookings} booking
                                {prop.bookings !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-fg shrink-0 ml-4">
                            {formatCurrency(prop.revenue)}
                          </span>
                        </div>
                        {/* Inline revenue bar */}
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
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
