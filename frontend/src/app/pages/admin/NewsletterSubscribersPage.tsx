import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Download } from "lucide-react";

interface NewsletterSubscriber {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  source: string | null;
  createdAt: string;
}

interface NewsletterSubscribersResponse {
  subscribers: NewsletterSubscriber[];
  total: number;
}

function downloadCsv(subscribers: NewsletterSubscriber[]) {
  const rows = [
    ["Full Name", "Email", "Phone", "Heard about us via", "Signed up"],
    ...subscribers.map((s) => [
      s.fullName ?? "",
      s.email,
      s.phone ?? "",
      s.source ?? "",
      new Date(s.createdAt).toISOString(),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function NewsletterSubscribersPage() {
  const { data, isLoading } = useApiQuery<NewsletterSubscribersResponse>({
    queryKey: [QUERY_KEYS.NEWSLETTER_SUBSCRIBERS],
    endpoint: ENDPOINTS.NEWSLETTER_SUBSCRIBERS,
  });

  const subscribers = data?.subscribers ?? [];

  const columns: TableColumn<NewsletterSubscriber>[] = [
    {
      header: "Full Name",
      field: "fullName",
      render: (row) => row.fullName || <span className="text-muted">—</span>,
    },
    {
      header: "Email",
      field: "email",
    },
    {
      header: "Phone",
      field: "phone",
      render: (row) => row.phone || <span className="text-muted">—</span>,
    },
    {
      header: "Heard about us via",
      field: "source",
      render: (row) => row.source || <span className="text-muted">—</span>,
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
          <h1 className="text-3xl font-bold text-fg">Newsletter Signups</h1>
          <p className="text-muted mt-1">
            Everyone who signed up via the "Get the best deals first" popup
          </p>
        </div>
        <Button
          variant="outline"
          className="border-line"
          disabled={subscribers.length === 0}
          onClick={() => downloadCsv(subscribers)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-glass-2 border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            {data ? `${data.total} subscriber${data.total === 1 ? "" : "s"}` : "Subscribers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={subscribers}
            loading={isLoading}
            emptyMessage="No newsletter signups yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
