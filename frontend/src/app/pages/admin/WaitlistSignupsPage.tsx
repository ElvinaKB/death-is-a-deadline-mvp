import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Download } from "lucide-react";

interface WaitlistSignup {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  source: string | null;
  createdAt: string;
}

interface WaitlistSignupsResponse {
  signups: WaitlistSignup[];
  total: number;
}

function downloadCsv(signups: WaitlistSignup[]) {
  const rows = [
    ["Full Name", "Email", "Phone", "Source", "Signed up"],
    ...signups.map((s) => [
      s.fullName,
      s.email,
      s.phone ?? "",
      s.source ?? "",
      new Date(s.createdAt).toISOString(),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `waitlist-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function WaitlistSignupsPage() {
  const { data, isLoading } = useApiQuery<WaitlistSignupsResponse>({
    queryKey: [QUERY_KEYS.WAITLIST_SIGNUPS],
    endpoint: ENDPOINTS.WAITLIST_SIGNUPS,
  });

  const signups = data?.signups ?? [];

  const columns: TableColumn<WaitlistSignup>[] = [
    {
      header: "Full Name",
      field: "fullName",
    },
    {
      header: "Email",
      field: "email",
    },
    {
      header: "Phone",
      field: "phone",
      render: (row) => row.phone || "-",
    },
    {
      header: "Heard about us via",
      field: "source",
      render: (row) => row.source || "-",
    },
    {
      header: "Signed up",
      field: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Waitlist Signups</h1>
          <p className="text-muted mt-1">
            Everyone who joined the waitlist at deadlinetravel.com/waitlist
          </p>
        </div>
        <Button
          variant="outline"
          className="border-line"
          disabled={signups.length === 0}
          onClick={() => downloadCsv(signups)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-glass-2 border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            {data ? `${data.total} signup${data.total === 1 ? "" : "s"}` : "Signups"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={signups}
            loading={isLoading}
            emptyMessage="No waitlist signups yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
