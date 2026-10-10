import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { ROUTES } from "../../../config/routes.config";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { formatCurrency } from "../../../utils/currency";
import { downloadCsv } from "../../../utils/downloadCsv";

type Outcome = "BOOKED" | "WALKED_AWAY" | "NO_EXIT_RECORDED";

interface Range {
  min: number;
  max: number;
  avg: number;
  median: number;
}

interface PlaceSummary {
  place: {
    id: string;
    name: string;
    city: string;
    supplySource: string;
    retailPrice: number;
    reservationPhone: string | null;
    email: string | null;
    starRating: number | null;
    guestRating: number | null;
  };
  days: number;
  totals: {
    views: number;
    uniqueViewers: number;
    bids: number;
    bidders: number;
    sessions: number;
    booked: number;
    walkedAway: number;
    noExitRecorded: number;
    bookedRevenue: number;
    conversionPct: number | null;
  };
  bidPerNight: Range | null;
  bestFinalUnbooked: Range | null;
  byLeadTime: { label: string; bids: number; avgBid: number | null }[];
  byWeekday: { label: string; bids: number; avgBid: number | null }[];
  pitch: string | null;
  sessions: {
    sessionId: string;
    memberName: string | null;
    memberEmail: string | null;
    checkInDate: string;
    checkOutDate: string;
    startedAt: string;
    lastBidAt: string;
    bidCount: number;
    firstBidPerNight: number;
    bestBidPerNight: number;
    finalBidPerNight: number;
    outcome: Outcome;
    exitedAt: string | null;
  }[];
}

const OUTCOME_STYLE: Record<Outcome, { label: string; className: string }> = {
  BOOKED: { label: "Booked", className: "bg-success/20 text-success" },
  WALKED_AWAY: { label: "Walked away", className: "bg-urgent/20 text-urgent" },
  NO_EXIT_RECORDED: { label: "No exit recorded", className: "bg-glass text-muted" },
};

const PERIODS = [7, 30, 90, 365];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-glass-2 p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="text-2xl font-bold text-fg mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

const range = (r: Range | null) =>
  r ? `${formatCurrency(r.min)}–${formatCurrency(r.max)}` : "—";

/**
 * Hotel data page: demand at this hotel (views, bids, sessions), each
 * member's best-and-final offer, and a ready-to-read pitch line for the GM
 * call. CSV export has every bid with its session and outcome.
 */
export function PlaceDataPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useApiQuery<PlaceSummary>({
    queryKey: ["analytics", "place", id, days],
    endpoint: getEndpoint(ENDPOINTS.ANALYTICS_PLACE_SUMMARY, { id }),
    params: { days: String(days) },
    placeholderData: undefined,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv(
        `${ENDPOINTS.ANALYTICS_BIDS_CSV}?placeId=${encodeURIComponent(id)}&days=${days}`,
        `deadline-bids-${data?.place.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() ?? id}-${days}d.csv`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-12" />
        <SkeletonLoader className="h-40" />
        <SkeletonLoader className="h-64" />
      </div>
    );
  }

  const { place, totals } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(ROUTES.ADMIN_PLACES)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-fg">{place.name}</h1>
            <p className="text-muted mt-1">
              {place.city} ·{" "}
              {place.supplySource === "wholesale" ? "Wholesale (Nuitee)" : "Direct partner"}
              {place.starRating ? ` · ${place.starRating}★` : ""}
              {place.guestRating ? ` · ${place.guestRating}/10 guests` : ""}
              {place.reservationPhone ? ` · ${place.reservationPhone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-glass p-1">
            {PERIODS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-sm font-semibold ${
                  days === d ? "bg-gold text-black" : "text-muted hover:text-fg"
                }`}
              >
                {d === 365 ? "1y" : `${d}d`}
              </button>
            ))}
          </div>
          <Button onClick={exportCsv} disabled={exporting} className="btn-bid">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      <Card className="border-gold/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            For your GM call
            {data.pitch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigator.clipboard
                    .writeText(data.pitch!)
                    .then(() => toast.success("Copied"))
                }
              >
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-fg leading-relaxed">
            {data.pitch ?? "No bids at this hotel in this period yet."}
          </p>
          <p className="text-xs text-muted mt-3">
            Lead with the demand, then ask for a private member rate direct at 7%.
            Share numbers, never member names or emails.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Listing views" value={String(totals.views)} hint={`${totals.uniqueViewers} members`} />
        <Stat label="Bids" value={String(totals.bids)} hint={`${totals.bidders} bidders`} />
        <Stat
          label="Booked"
          value={String(totals.booked)}
          hint={`${totals.conversionPct ?? 0}% of ${totals.sessions} sessions · ${formatCurrency(totals.bookedRevenue)}`}
        />
        <Stat
          label="Walked away"
          value={String(totals.walkedAway)}
          hint={`+${totals.noExitRecorded} with no exit recorded`}
        />
        <Stat label="Bid range / night" value={range(data.bidPerNight)} hint={data.bidPerNight ? `avg ${formatCurrency(data.bidPerNight.avg)}` : undefined} />
        <Stat
          label="Best & final (unbooked)"
          value={range(data.bestFinalUnbooked)}
          hint={data.bestFinalUnbooked ? `avg ${formatCurrency(data.bestFinalUnbooked.avg)} · median ${formatCurrency(data.bestFinalUnbooked.median)}` : undefined}
        />
        <Stat label="Retail anchor" value={formatCurrency(place.retailPrice)} hint="per night, last import" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { title: "Bids by how far ahead", rows: data.byLeadTime },
          { title: "Bids by check-in day", rows: data.byWeekday },
        ].map(({ title, rows }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-muted">{r.label}</span>
                  <span className="text-fg tabular-nums">
                    {r.bids} bid{r.bids === 1 ? "" : "s"}
                    {r.avgBid != null && ` · avg ${formatCurrency(r.avgBid)}`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bidding sessions ({data.sessions.length})
          </CardTitle>
          <p className="text-xs text-muted">
            A session is one member's bids on the same dates with no gap over 30
            minutes. "Final" is their best-and-final offer before they booked or
            left.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 font-medium">Stay</th>
                <th className="py-2 pr-3 font-medium">Last bid</th>
                <th className="py-2 pr-3 font-medium text-right">Bids</th>
                <th className="py-2 pr-3 font-medium text-right">First</th>
                <th className="py-2 pr-3 font-medium text-right">Final</th>
                <th className="py-2 pr-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.sessionId} className="border-t border-line">
                  <td className="py-2 pr-3 text-fg">
                    {s.memberName || s.memberEmail || "—"}
                  </td>
                  <td className="py-2 pr-3 text-muted whitespace-nowrap">
                    {s.checkInDate} → {s.checkOutDate}
                  </td>
                  <td className="py-2 pr-3 text-muted whitespace-nowrap">
                    {new Date(s.lastBidAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.bidCount}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">
                    {formatCurrency(s.firstBidPerNight)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-bold text-gold">
                    {formatCurrency(s.finalBidPerNight)}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge className={OUTCOME_STYLE[s.outcome].className}>
                      {OUTCOME_STYLE[s.outcome].label}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data.sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    No bidding sessions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
