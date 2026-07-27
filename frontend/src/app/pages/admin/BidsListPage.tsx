import { useState } from "react";
import { useBids, useUpdatePayout } from "../../../hooks/useBids";
import { Bid, BidStatus } from "../../../types/bid.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
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
import { DollarSign, EyeIcon, XCircle } from "lucide-react";
import { PayoutModal } from "../../components/bids/PayoutModal";
import { CancelBidModal } from "../../components/bids/CancelBidModal";
import { useDebounce } from "../../../hooks/useDebounce";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { getPayoutState, payoutEligibleAt } from "../../../utils/payout";

interface PayoutSummary {
  dueCount: number;
  dueAmount: number;
  heldCount: number;
  paidCount: number;
  holdHours: number;
}

interface MercuryHealth {
  connected: boolean;
  reason?: string;
  recipientCount?: number;
  accounts?: {
    id: string;
    name: string | null;
    last4: string | null;
    availableBalance: number | null;
  }[];
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
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
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

  const updatePayout = useUpdatePayout();

  const { data: payoutSummary } = useApiQuery<PayoutSummary>({
    queryKey: [QUERY_KEYS.PAYOUT_SUMMARY],
    endpoint: ENDPOINTS.BID_PAYOUT_SUMMARY,
    staleTime: 60_000,
  });

  const { data: mercuryHealth } = useApiQuery<MercuryHealth>({
    queryKey: ["mercury-health"],
    endpoint: ENDPOINTS.MERCURY_HEALTH,
    staleTime: 60_000,
    retry: false,
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

  const getHotelPaidBadge = (isPaidToHotel: boolean) => {
    return (
      <Badge
        className={
          isPaidToHotel
            ? "bg-success/20 text-success"
            : "bg-warning/20 text-warning"
        }
      >
        {isPaidToHotel ? "Paid" : "Unpaid"}
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
      header: "Student",
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
      header: "Student Paid",
      field: "payment",
      render: (row) => getStudentPaidBadge(row.payment),
    },
    {
      header: "Hotel Paid",
      field: "isPaidToHotel",
      render: (row) => {
        const canToggle =
          row.status === BidStatus.ACCEPTED &&
          row.payment &&
          row.payment.status === "CAPTURED";

        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.isPaidToHotel}
              disabled={!canToggle || updatePayout.isPending}
              onCheckedChange={(checked) => {
                updatePayout.mutate({
                  id: row.id,
                  isPaidToHotel: checked,
                });
              }}
            />
            {getHotelPaidBadge(row.isPaidToHotel)}
          </div>
        );
      },
    },
    {
      header: "Pay-safe",
      field: "checkOutDate",
      render: (row) => {
        const state = getPayoutState(row);
        if (state === "paid") {
          return (
            <span className="text-xs text-muted">
              Paid
              {row.paidToHotelAt
                ? ` ${format(new Date(row.paidToHotelAt), "MMM d")}`
                : ""}
            </span>
          );
        }
        if (state === "na") return <span className="text-xs text-muted">—</span>;
        if (state === "due") {
          return (
            <Badge className="bg-success/20 text-success">Due now</Badge>
          );
        }
        // held
        return (
          <span className="text-xs text-warning">
            Hold until {format(payoutEligibleAt(row.checkOutDate), "MMM d")}
          </span>
        );
      },
    },
    {
      header: "Actions",
      field: "id",
      render: (row) => {
        const canViewPayout = row.status === BidStatus.ACCEPTED;
        const canCancel =
          row.status === BidStatus.ACCEPTED &&
          row.payment?.status === "CAPTURED";

        if (!canViewPayout) return null;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedBid(row)}
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Button>
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
          View all bids and their payment status
        </p>
      </div>

      {payoutSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card
            className={
              payoutSummary.dueCount > 0
                ? "bg-success/10 border-success/40"
                : "bg-glass border-line"
            }
          >
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted">
                Due to pay now
              </p>
              <p className="text-2xl font-bold text-fg mt-1">
                {payoutSummary.dueCount}
                <span className="text-base font-medium text-muted ml-2">
                  {formatCurrency(payoutSummary.dueAmount)}
                </span>
              </p>
              <p className="text-xs text-muted mt-1">
                Past checkout + {payoutSummary.holdHours}h, still unpaid
              </p>
            </CardContent>
          </Card>
          <Card className="bg-glass border-line">
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted">
                Held (too early)
              </p>
              <p className="text-2xl font-bold text-fg mt-1">
                {payoutSummary.heldCount}
              </p>
              <p className="text-xs text-muted mt-1">
                Within {payoutSummary.holdHours}h of checkout
              </p>
            </CardContent>
          </Card>
          <Card className="bg-glass border-line">
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted">
                Paid
              </p>
              <p className="text-2xl font-bold text-fg mt-1">
                {payoutSummary.paidCount}
              </p>
              <p className="text-xs text-muted mt-1">Hotels settled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {mercuryHealth && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            mercuryHealth.connected
              ? "border-success/40 bg-success/10"
              : "border-warning/40 bg-warning/10"
          }`}
        >
          {mercuryHealth.connected ? (
            <span className="text-fg">
              <span className="font-semibold text-success">
                ● Mercury connected
              </span>
              {mercuryHealth.accounts && mercuryHealth.accounts.length > 0 && (
                <>
                  {" "}
                  · account{" "}
                  {mercuryHealth.accounts[0].name
                    ? `${mercuryHealth.accounts[0].name} `
                    : ""}
                  {mercuryHealth.accounts[0].last4
                    ? `••${mercuryHealth.accounts[0].last4}`
                    : ""}
                </>
              )}{" "}
              · {mercuryHealth.recipientCount ?? 0} recipient
              {(mercuryHealth.recipientCount ?? 0) === 1 ? "" : "s"} on file
            </span>
          ) : (
            <span className="text-fg">
              <span className="font-semibold text-warning">
                ● Mercury not connected
              </span>{" "}
              — {mercuryHealth.reason || "check MERCURY_API_TOKEN"}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label className="text-fg">Search</Label>
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Guest email or hotel name"
            className="bg-glass border-line text-fg placeholder:text-muted"
          />
        </div>
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
      </div>

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

      {/* Payout Modal */}
      <PayoutModal
        bid={selectedBid}
        open={!!selectedBid}
        onOpenChange={(open) => {
          if (!open) setSelectedBid(null);
        }}
      />

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
