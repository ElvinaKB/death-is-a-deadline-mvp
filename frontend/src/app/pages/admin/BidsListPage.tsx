import { useState } from "react";
import { useBids, useUpdatePayout } from "../../../hooks/useBids";
import { Bid, BidStatus } from "../../../types/bid.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
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
import { DollarSign, EyeIcon } from "lucide-react";
import { PayoutModal } from "../../components/bids/PayoutModal";

const BID_STATUS_COLORS: Record<BidStatus, string> = {
  [BidStatus.PENDING]: "bg-warning/20 text-warning hover:bg-warning/30",
  [BidStatus.ACCEPTED]: "bg-success/20 text-success hover:bg-success/30",
  [BidStatus.REJECTED]: "bg-danger/20 text-danger hover:bg-danger/30",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-muted/20 text-muted",
  REQUIRES_ACTION: "bg-brand/20 text-brand",
  AUTHORIZED: "bg-brand/20 text-brand",
  CAPTURED: "bg-success/20 text-success",
  CANCELLED: "bg-danger/20 text-danger",
  FAILED: "bg-danger/20 text-danger",
  EXPIRED: "bg-warning/20 text-warning",
};

export function BidsListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<BidStatus | "ALL">("ALL");
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const { data, isLoading } = useBids({
    page: currentPage,
    limit: 10,
    ...(filter !== "ALL" ? { status: filter } : {}),
  });

  const updatePayout = useUpdatePayout();

  const getBidStatusBadge = (status: BidStatus) => {
    return (
      <Badge className={BID_STATUS_COLORS[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-muted border-line">
          No Payment
        </Badge>
      );
    }
    return (
      <Badge className={PAYMENT_STATUS_COLORS[status] || "bg-muted/20"}>
        {status.replace(/_/g, " ")}
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
            {format(new Date(row.checkInDate), "MMM d, yyyy")}
          </p>
          <p className="text-muted">
            to {format(new Date(row.checkOutDate), "MMM d, yyyy")}
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
      header: "Payment Status",
      field: "payment",
      render: (row) => getPaymentStatusBadge(row.payment?.status),
    },
    {
      header: "Hotel Paid",
      field: "isPaidToHotel",
      render: (row) => {
        const canToggle =
          row.status === BidStatus.ACCEPTED &&
          row.payment &&
          ["AUTHORIZED", "CAPTURED"].includes(row.payment.status);

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
            <span className="text-xs text-muted">
              {row.isPaidToHotel ? "Paid" : "Unpaid"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Actions",
      field: "id",
      render: (row) => {
        const canViewPayout = row.status === BidStatus.ACCEPTED;

        if (!canViewPayout) return null;

        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedBid(row)}
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </Button>
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
    </div>
  );
}
