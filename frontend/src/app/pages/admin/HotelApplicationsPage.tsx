import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Download } from "lucide-react";

interface HotelApplication {
  id: string;
  hotelName: string;
  address: string;
  phone: string;
  email: string;
  daysOfWeek: number[];
  roomsPerDay: number;
  secretPrice: string | number;
  pms: string[];
  pmsOther: string | null;
  status: string;
  createdAt: string;
}

interface HotelApplicationsResponse {
  applications: HotelApplication[];
  total: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PMS_LABELS: Record<string, string> = {
  cloudbeds: "Cloudbeds",
  siteminder: "SiteMinder",
  other: "Other",
};

const formatDays = (days: number[]) =>
  [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ") || "—";

const formatPms = (row: HotelApplication) => {
  const parts = [
    ...row.pms.map((p) => PMS_LABELS[p] ?? p),
    ...(row.pmsOther ? [`Other: ${row.pmsOther}`] : []),
  ];
  return parts.join(", ") || "—";
};

function downloadCsv(applications: HotelApplication[]) {
  const rows = [
    [
      "Hotel",
      "Email",
      "Phone",
      "Address",
      "Days",
      "Rooms/day",
      "Secret price",
      "PMS",
      "Submitted",
    ],
    ...applications.map((a) => [
      a.hotelName,
      a.email,
      a.phone,
      a.address,
      formatDays(a.daysOfWeek),
      String(a.roomsPerDay),
      String(a.secretPrice),
      formatPms(a),
      new Date(a.createdAt).toISOString(),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hotel-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HotelApplicationsPage() {
  const { data, isLoading } = useApiQuery<HotelApplicationsResponse>({
    queryKey: [QUERY_KEYS.HOTEL_APPLICATIONS],
    endpoint: ENDPOINTS.HOTEL_APPLICATION,
  });

  const applications = data?.applications ?? [];

  const columns: TableColumn<HotelApplication>[] = [
    {
      header: "#",
      field: "id",
      // Signup ordinal: oldest = 1, newest (top) = total.
      render: (_row, i) => (
        <span className="text-muted tabular-nums">
          {applications.length - i}
        </span>
      ),
    },
    {
      header: "Hotel",
      field: "hotelName",
      render: (row) => (
        <div>
          <div className="text-fg">{row.hotelName}</div>
          <div className="text-xs text-muted">{row.address}</div>
        </div>
      ),
    },
    {
      header: "Contact",
      field: "email",
      render: (row) => (
        <div className="text-xs">
          <div className="text-fg">{row.email}</div>
          <div className="text-muted">{row.phone}</div>
        </div>
      ),
    },
    {
      header: "Days",
      field: "daysOfWeek",
      render: (row) => formatDays(row.daysOfWeek),
    },
    {
      header: "Rooms",
      field: "roomsPerDay",
    },
    {
      header: "Secret price",
      field: "secretPrice",
      render: (row) => `$${Number(row.secretPrice).toFixed(2)}`,
    },
    {
      header: "PMS",
      field: "pms",
      render: (row) => formatPms(row),
    },
    {
      header: "Submitted",
      field: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Hotel Sign-ups</h1>
          <p className="text-muted mt-1">
            Hotels that applied via the public &ldquo;Ready to Join?&rdquo; form
          </p>
        </div>
        <Button
          variant="outline"
          className="border-line"
          disabled={applications.length === 0}
          onClick={() => downloadCsv(applications)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-glass-2 border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            {isLoading
              ? "Applications"
              : `${applications.length} application${applications.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={applications}
            loading={isLoading}
            emptyMessage="No hotel sign-ups yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
