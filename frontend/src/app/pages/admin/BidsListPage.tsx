import { useState } from "react";
import { useBids } from "../../../hooks/useBids";
import { Bid, BidStatus } from "../../../types/bid.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Badge } from "../../components/ui/badge";
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

const BID_STATUS_COLORS: Record<BidStatus, string> = {
  [BidStatus.PENDING]: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  [BidStatus.ACCEPTED]: "bg-green-100 text-green-800 hover:bg-green-100",
  [BidStatus.REJECTED]: "bg-red-100 text-red-800 hover:bg-red-100",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  REQUIRES_ACTION: "bg-blue-100 text-blue-800",
  AUTHORIZED: "bg-purple-100 text-purple-800",
  CAPTURED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  EXPIRED: "bg-orange-100 text-orange-800",
};

export function BidsListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<BidStatus | "ALL">("ALL");

  const { data, isLoading } = useBids({
    page: currentPage,
    limit: 10,
    ...(filter !== "ALL" ? { status: filter } : {}),
  });

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
        <Badge variant="outline" className="text-gray-500">
          No Payment
        </Badge>
      );
    }
    return (
      <Badge className={PAYMENT_STATUS_COLORS[status] || "bg-gray-100"}>
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
          <p className="font-medium">{row.student?.name || "N/A"}</p>
          <p className="text-sm text-muted-foreground">
            {row.student?.email || "-"}
          </p>
        </div>
      ),
    },
    {
      header: "Place",
      field: "placeId",
      render: (row) => (
        <div>
          <p className="font-medium">{row.place?.name || "N/A"}</p>
          <p className="text-sm text-muted-foreground">
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
          <p>{format(new Date(row.checkInDate), "MMM d, yyyy")}</p>
          <p className="text-muted-foreground">
            to {format(new Date(row.checkOutDate), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            ({row.totalNights} nights)
          </p>
        </div>
      ),
    },
    {
      header: "Amount",
      field: "totalAmount",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium">{formatCurrency(row.totalAmount)}</p>
          <p className="text-muted-foreground">
            {formatCurrency(row.bidPerNight)}/night
          </p>
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
      header: "Created",
      field: "createdAt",
      render: (row) => (
        <span className="text-sm">
          {format(new Date(row.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  const bids = data?.bids || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bids</h1>
        <p className="text-muted-foreground mt-1">
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
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value={BidStatus.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={BidStatus.ACCEPTED}>Accepted</TabsTrigger>
          <TabsTrigger value={BidStatus.REJECTED}>Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bids List</CardTitle>
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
    </div>
  );
}
