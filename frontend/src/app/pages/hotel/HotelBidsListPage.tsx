import { format } from "date-fns";
import { CalendarCheck, DollarSign, FileText, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useHotelBids } from "../../../hooks/useBids";
import { TableColumn } from "../../../types/api.types";
import { Bid, BidStatus } from "../../../types/bid.types";
import { HotelBidInvoiceModal } from "../../components/bids/HotelBidInvoiceModal";
import { DataTable } from "../../components/common/DataTable";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
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
import { useHotel } from "../../../hooks/useHotel";

const BID_STATUS_COLORS: Record<BidStatus, string> = {
  [BidStatus.PENDING]: "bg-warning/20 text-warning",
  [BidStatus.ACCEPTED]: "bg-success/20 text-success",
  [BidStatus.REJECTED]: "bg-danger/20 text-danger",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

export function HotelBidsPage() {
  const { selectedHotelId } = useHotel();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<BidStatus | "ALL">("ALL");
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const { data, isFetching: isLoading } = useHotelBids({
    page: currentPage,
    limit: 10,
    ...(filter !== "ALL" ? { status: filter } : {}),
    placeId: selectedHotelId,
  });

  const bids = data?.bids || [];

  // Summary stats — only from accepted + captured bids
  const acceptedBids = bids.filter(
    (b) => b.status === BidStatus.ACCEPTED && b.payment?.status === "CAPTURED",
  );
  const totalEarned = acceptedBids.reduce(
    (sum, b) => sum + (b.payableToHotel ?? 0),
    0,
  );
  const totalPaidOut = acceptedBids
    .filter((b) => b.isPaidToHotel)
    .reduce((sum, b) => sum + (b.payableToHotel ?? 0), 0);
  const totalPending = totalEarned - totalPaidOut;

  const columns: TableColumn<Bid>[] = [
    {
      header: "Student",
      field: "studentId",
      render: (row) => (
        <div>
          <p className="font-medium text-fg text-sm">
            {row.student?.name || "N/A"}
          </p>
          <p className="text-xs text-muted hidden sm:block">
            {row.student?.email || "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Dates",
      field: "checkInDate",
      render: (row) => (
        <div className="text-xs sm:text-sm">
          <p className="text-fg">
            {format(new Date(row.checkInDate), "MMM d, yyyy")}
          </p>
          <p className="text-muted">
            → {format(new Date(row.checkOutDate), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted">({row.totalNights}n)</p>
        </div>
      ),
    },
    {
      header: "You Earn",
      field: "payableToHotel",
      render: (row) => (
        <div className="text-sm">
          <p className="font-semibold text-success">
            {formatCurrency(row.payableToHotel ?? 0)}
          </p>
          <p className="text-xs text-muted">
            {formatCurrency(row.bidPerNight)}/night
          </p>
        </div>
      ),
    },
    {
      header: "Bid Status",
      field: "status",
      render: (row) => (
        <Badge className={`text-xs ${BID_STATUS_COLORS[row.status]}`}>
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      header: "Student Paid",
      field: "payment",
      render: (row) => {
        const paid = row.payment?.status === "CAPTURED";
        return (
          <Badge
            className={`text-xs ${paid ? "bg-success/20 text-success" : "bg-muted/20 text-muted"}`}
          >
            {paid ? "Paid" : "Unpaid"}
          </Badge>
        );
      },
    },
    {
      header: "Payout",
      field: "isPaidToHotel",
      render: (row) => (
        <Badge
          className={`text-xs ${
            row.isPaidToHotel
              ? "bg-success/20 text-success"
              : "bg-warning/20 text-warning"
          }`}
        >
          {row.isPaidToHotel ? "Received" : "Pending"}
        </Badge>
      ),
    },
    {
      header: "",
      field: "id",
      render: (row) =>
        row.status === BidStatus.ACCEPTED ? (
          <Button
            variant="outline"
            size="sm"
            className="border-line text-fg hover:bg-glass h-8 text-xs"
            onClick={() => setSelectedBid(row)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Invoice
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">My Bookings</h1>
        <p className="text-muted mt-1 text-sm">
          Track all bookings and your earnings
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-glass-2 border-line">
          <CardContent className="pt-4 pb-4 px-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">
                  Total Earned
                </p>
                <p className="text-xl sm:text-2xl font-bold text-fg">
                  {formatCurrency(totalEarned)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass-2 border-line">
          <CardContent className="pt-4 pb-4 px-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">
                  Paid Out
                </p>
                <p className="text-xl sm:text-2xl font-bold text-fg">
                  {formatCurrency(totalPaidOut)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass-2 border-line">
          <CardContent className="pt-4 pb-4 px-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">
                  Awaiting Payout
                </p>
                <p className="text-xl sm:text-2xl font-bold text-warning">
                  {formatCurrency(totalPending)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + table */}
      <Tabs
        defaultValue="ALL"
        value={filter}
        onValueChange={(v) => {
          setFilter(v as BidStatus | "ALL");
          setCurrentPage(1);
        }}
      >
        <TabsList className="bg-glass border border-line">
          {(
            [
              "ALL",
              BidStatus.PENDING,
              BidStatus.ACCEPTED,
              BidStatus.REJECTED,
            ] as const
          ).map((val) => (
            <TabsTrigger
              key={val}
              value={val}
              className="data-[state=active]:bg-brand data-[state=active]:text-white text-xs sm:text-sm"
            >
              {val === "ALL"
                ? "All"
                : val.charAt(0) + val.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter} className="mt-4 sm:mt-6">
          <Card className="glass-2 border-line">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-fg text-base sm:text-lg">
                Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 overflow-x-auto">
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
                emptyMessage="No bookings found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HotelBidInvoiceModal
        bid={selectedBid}
        open={!!selectedBid}
        onOpenChange={(open) => {
          if (!open) setSelectedBid(null);
        }}
      />
    </div>
  );
}
