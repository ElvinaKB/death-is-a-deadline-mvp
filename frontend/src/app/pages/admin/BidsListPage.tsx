import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBids } from "../../../hooks/useBids";
import { Bid, BidStatus } from "../../../types/bid.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { format } from "date-fns";
import { formatBookingDate } from "../../../utils/dateHelpers";
import { XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { toast } from "sonner";
import { CancelBidModal } from "../../components/bids/CancelBidModal";
import { useDebounce } from "../../../hooks/useDebounce";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";

interface BidsOverview {
  totalBids: number;
  bidsLast7Days: number;
  membersLast7Days: number;
  wins: number;
  booked: number;
  unpaidWins: number;
  commissionEarned: number;
}

interface MemberRow {
  studentId: string;
  name: string | null;
  email: string | null;
  bids: number;
  hotels: number;
  booked: number;
  lastBidAt: string;
  lastBid: {
    placeId: string;
    hotel: string;
    city: string;
    supplySource: string;
    bidPerNight: number;
    checkInDate: string;
    checkOutDate: string;
    status: string;
  } | null;
}

const BID_STATUS_COLORS: Record<BidStatus, string> = {
  [BidStatus.PENDING]: "bg-warning/20 text-warning hover:bg-warning/30",
  [BidStatus.ACCEPTED]: "bg-success/20 text-success hover:bg-success/30",
  [BidStatus.REJECTED]: "bg-danger/20 text-danger hover:bg-danger/30",
  [BidStatus.CANCELLED]: "bg-muted/20 text-muted hover:bg-muted/30",
};

export function BidsListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<BidStatus | "ALL">("ALL");
  const [view, setView] = useState<"members" | "all">("members");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bidToCancel, setBidToCancel] = useState<Bid | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const search = useDebounce(searchInput, 400);

  const { data, isLoading } = useBids({
    page: currentPage,
    limit: 10,
    ...(filter !== "ALL" ? { status: filter } : {}),
    ...(search ? { search } : {}),
    ...(checkInFrom ? { checkInFrom } : {}),
    ...(checkInTo ? { checkInTo } : {}),
  });

  const queryClient = useQueryClient();

  const repushMutation = useApiMutation<
    { data?: { pushed?: boolean }; error?: string },
    { id: string }
  >({
    endpoint: (vars) => getEndpoint(ENDPOINTS.BID_REPUSH_CHANNEL, { id: vars.id }),
    showErrorToast: false,
    onSuccess: (res) => {
      if (res?.data?.pushed) {
        toast.success(
          "Re-pushed to Cloudbeds. Give it a minute, then refresh the PMS.",
        );
      } else {
        toast.error(
          `Channel did not accept the push: ${res?.error ?? "unknown error"}`,
        );
      }
    },
    onError: (err) => toast.error(err.message || "Re-push failed"),
  });

  const { data: overview } = useApiQuery<BidsOverview>({
    queryKey: ["bids-overview"],
    endpoint: ENDPOINTS.ANALYTICS_BIDS_OVERVIEW,
    staleTime: 60_000,
  });

  const { data: memberData, isLoading: membersLoading } = useApiQuery<{
    total: number;
    members: MemberRow[];
  }>({
    queryKey: ["bid-members", currentPage, search],
    endpoint: ENDPOINTS.ANALYTICS_MEMBERS,
    params: { page: currentPage, limit: 20, ...(search ? { search } : {}) },
    enabled: view === "members",
  });

  const getBidStatusBadge = (status: BidStatus) => {
    return (
      <Badge className={BID_STATUS_COLORS[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const getStudentPaidBadge = (payment?: { status: string } | null) => {
    const isStudentPaid = payment?.status === "CAPTURED";
    return (
      <Badge
        className={
          isStudentPaid
            ? "bg-success/20 text-success"
            : "bg-muted/20 text-muted"
        }
      >
        {isStudentPaid ? "Paid" : "Unpaid"}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const columns: TableColumn<Bid>[] = [
    {
      header: "Member",
      field: "studentId",
      render: (row) => (
        <div>
          <p className="font-medium text-fg">{row.student?.name || "N/A"}</p>
          <p className="text-sm text-muted">{row.student?.email || "-"}</p>
        </div>
      ),
    },
    {
      header: "Place",
      field: "placeId",
      render: (row) => (
        <div>
          <p className="font-medium text-fg">{row.place?.name || "N/A"}</p>
          <p className="text-sm text-muted">
            {row.place?.city}, {row.place?.country}
          </p>
        </div>
      ),
    },
    {
      header: "Dates",
      field: "checkInDate",
      render: (row) => (
        <div className="text-sm">
          <p className="text-fg">
            {formatBookingDate(row.checkInDate, "MMM d, yyyy")}
          </p>
          <p className="text-muted">
            to {formatBookingDate(row.checkOutDate, "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted">({row.totalNights} nights)</p>
        </div>
      ),
    },
    {
      header: "Amount",
      field: "totalAmount",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium text-fg">
            {formatCurrency(row.totalAmount)}
          </p>
          <p className="text-muted">{formatCurrency(row.bidPerNight)}/night</p>
        </div>
      ),
    },
    {
      header: "Bid Status",
      field: "status",
      render: (row) => getBidStatusBadge(row.status),
    },
    {
      header: "Member paid",
      field: "payment",
      render: (row) => getStudentPaidBadge(row.payment),
    },
    {
      header: "Actions",
      field: "id",
      render: (row) => {
        const canCancel =
          row.status === BidStatus.ACCEPTED &&
          row.payment?.status === "CAPTURED";
        if (!canCancel) return null;

        return (
          <div className="flex items-center gap-2">
            {canCancel && (
              <Button
                variant="secondary"
                size="sm"
                disabled={repushMutation.isPending}
                title="Re-send this paid booking to the hotel's Cloudbeds calendar"
                onClick={() => repushMutation.mutate({ id: row.id })}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Re-push
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBidToCancel(row)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
    {
      header: "Created",
      field: "createdAt",
      render: (row) => (
        <span className="text-sm text-fg">
          {format(new Date(row.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  const bids = data?.bids || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg">Bids</h1>
        <p className="text-muted mt-1">
          Every bid, won or lost. By member groups each traveler&apos;s
          history; open one to see all their bids.
        </p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Bids (7 days)",
              value: overview.bidsLast7Days,
              sub: `${overview.membersLast7Days} members · ${overview.totalBids} all-time`,
            },
            {
              label: "Booked",
              value: overview.booked,
              sub: "Paid bookings",
            },
            {
              label: "Won, not paid",
              value: overview.unpaidWins,
              sub: "Won or Book now, left at payment",
            },
            {
              label: "Commission earned",
              value: formatCurrency(overview.commissionEarned),
              sub: "Our cut on paid bookings",
            },
          ].map((c) => (
            <Card key={c.label} className="bg-glass border-line">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wider text-muted">{c.label}</p>
                <p className="text-2xl font-bold text-fg mt-1">{c.value}</p>
                <p className="text-xs text-muted mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="inline-flex rounded-lg border border-line bg-glass p-1">
        {(
          [
            ["members", "By member"],
            ["all", "All bids"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setView(v);
              setCurrentPage(1);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
              view === v ? "bg-gold text-black" : "text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label className="text-fg">Search</Label>
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Member email or hotel name"
            className="bg-glass border-line text-fg placeholder:text-muted"
          />
        </div>
        {view === "all" && (<>
        <div className="space-y-1.5">
          <Label className="text-fg">Check-in from</Label>
          <Input
            type="date"
            value={checkInFrom}
            onChange={(e) => {
              setCheckInFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-glass border-line text-fg"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-fg">Check-in to</Label>
          <Input
            type="date"
            value={checkInTo}
            onChange={(e) => {
              setCheckInTo(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-glass border-line text-fg"
          />
        </div>
        </>)}
      </div>

      {view === "members" ? (
        <MembersTable
          rows={memberData?.members ?? []}
          total={memberData?.total ?? 0}
          loading={membersLoading}
          page={currentPage}
          onPage={setCurrentPage}
          expanded={expanded}
          onToggle={(id) => setExpanded((cur) => (cur === id ? null : id))}
          formatCurrency={formatCurrency}
        />
      ) : (
      <Tabs
        defaultValue="ALL"
        value={filter}
        onValueChange={(v) => {
          setFilter(v as BidStatus | "ALL");
          setCurrentPage(1);
        }}
      >
        <TabsList className="bg-glass border border-line">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value={BidStatus.PENDING}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value={BidStatus.ACCEPTED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Accepted
          </TabsTrigger>
          <TabsTrigger
            value={BidStatus.REJECTED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Rejected
          </TabsTrigger>
          <TabsTrigger
            value={BidStatus.CANCELLED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Cancelled
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card className="glass-2 border-line">
            <CardHeader>
              <CardTitle className="text-fg">Bids List</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={bids}
                loading={isLoading}
                pagination={
                  data
                    ? {
                        currentPage,
                        totalPages: Math.ceil(data.total / (data.limit || 10)),
                        totalItems: data.total,
                        onPageChange: setCurrentPage,
                      }
                    : undefined
                }
                emptyMessage="No bids found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Cancel Bid Modal */}
      <CancelBidModal
        bid={bidToCancel}
        open={!!bidToCancel}
        onOpenChange={(open) => {
          if (!open) setBidToCancel(null);
        }}
      />

    </div>
  );
}

const STATUS_TEXT: Record<string, string> = {
  BOOKED: "text-success",
  ACCEPTED: "text-warning",
  REJECTED: "text-muted",
  CANCELLED: "text-muted",
  PENDING: "text-muted",
};

function statusLabel(status: string, paid?: boolean) {
  if (status === "BOOKED" || (status === "ACCEPTED" && paid)) return "Booked";
  if (status === "ACCEPTED") return "Won, not paid";
  if (status === "REJECTED") return "Lost";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function MembersTable({
  rows,
  total,
  loading,
  page,
  onPage,
  expanded,
  onToggle,
  formatCurrency,
}: {
  rows: MemberRow[];
  total: number;
  loading: boolean;
  page: number;
  onPage: (p: number) => void;
  expanded: string | null;
  onToggle: (id: string) => void;
  formatCurrency: (n: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <Card className="glass-2 border-line">
      <CardHeader>
        <CardTitle className="text-fg">
          Members who bid <span className="text-muted font-normal">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted">No bids found.</p>
        )}
        {rows.map((m) => {
          const open = expanded === m.studentId;
          return (
            <div key={m.studentId} className="rounded-lg border border-line">
              <button
                type="button"
                onClick={() => onToggle(m.studentId)}
                className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left hover:bg-glass"
              >
                <span className="col-span-12 sm:col-span-3 flex items-center gap-2 min-w-0">
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gold" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">
                      {m.name || "—"}
                    </span>
                    <span className="block truncate text-sm text-muted">{m.email}</span>
                  </span>
                </span>
                <span className="col-span-6 sm:col-span-4 min-w-0 text-sm">
                  {m.lastBid ? (
                    <>
                      <span className="block truncate text-fg">{m.lastBid.hotel}</span>
                      <span className="block text-muted">
                        {formatCurrency(m.lastBid.bidPerNight)}/night ·{" "}
                        {formatBookingDate(m.lastBid.checkInDate, "MMM d")} ·{" "}
                        <span className={STATUS_TEXT[m.lastBid.status] ?? "text-muted"}>
                          {statusLabel(m.lastBid.status)}
                        </span>
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="col-span-2 sm:col-span-2 text-sm text-fg">
                  {m.bids} bid{m.bids === 1 ? "" : "s"}
                  <span className="block text-muted">
                    {m.hotels} hotel{m.hotels === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="col-span-2 sm:col-span-1 text-sm text-fg">
                  {m.booked}
                  <span className="block text-muted">booked</span>
                </span>
                <span className="col-span-2 sm:col-span-2 text-sm text-muted text-right">
                  {format(new Date(m.lastBidAt), "MMM d, h:mm a")}
                </span>
              </button>
              {open && <MemberBids studentId={m.studentId} formatCurrency={formatCurrency} />}
            </div>
          );
        })}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              Previous
            </Button>
            Page {page} of {pages}
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** A member's full bid history (newest first), with links to the hotel's
 * data page and the member's profile / CSV. */
function MemberBids({
  studentId,
  formatCurrency,
}: {
  studentId: string;
  formatCurrency: (n: number) => string;
}) {
  const { data, isLoading } = useBids({ studentId, limit: 100 });
  const bids = data?.bids ?? [];
  return (
    <div className="border-t border-line bg-bg/40 px-4 py-3">
      <div className="mb-2 flex justify-end">
        <Link
          to={ROUTES.ADMIN_STUDENT_DETAIL.replace(":id", studentId)}
          className="text-sm font-semibold text-gold underline"
        >
          Full profile &amp; CSV →
        </Link>
      </div>
      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      <table className="w-full text-sm">
        <tbody>
          {bids.map((b) => (
            <tr key={b.id} className="border-t border-line/50">
              <td className="py-1.5 pr-3 text-muted whitespace-nowrap">
                {format(new Date(b.createdAt), "MMM d, h:mm a")}
              </td>
              <td className="py-1.5 pr-3">
                <Link
                  to={ROUTES.ADMIN_PLACES_DATA.replace(":id", b.placeId)}
                  className="text-fg hover:text-gold"
                >
                  {b.place?.name ?? "—"}
                </Link>
                <span className="text-muted"> · {b.place?.city}</span>
              </td>
              <td className="py-1.5 pr-3 text-muted whitespace-nowrap">
                {formatBookingDate(b.checkInDate, "MMM d")} →{" "}
                {formatBookingDate(b.checkOutDate, "MMM d")}
              </td>
              <td className="py-1.5 pr-3 font-medium text-fg whitespace-nowrap">
                {formatCurrency(b.bidPerNight)}/night
              </td>
              <td className={`py-1.5 whitespace-nowrap ${STATUS_TEXT[b.payment?.status === "CAPTURED" ? "BOOKED" : b.status] ?? "text-muted"}`}>
                {statusLabel(b.status, b.payment?.status === "CAPTURED")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
