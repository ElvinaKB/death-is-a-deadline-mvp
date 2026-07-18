import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Download, Mail } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

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
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const { data, isLoading } = useApiQuery<NewsletterSubscribersResponse>({
    queryKey: [QUERY_KEYS.NEWSLETTER_SUBSCRIBERS],
    endpoint: ENDPOINTS.NEWSLETTER_SUBSCRIBERS,
  });

  const sendWelcomeEmailsMutation = useApiMutation<
    { success: boolean; sent: number },
    void
  >({
    endpoint: ENDPOINTS.WAITLIST_SEND_WELCOME_EMAILS,
    onSuccess: (result) => {
      setConfirmSendOpen(false);
      toast.success(
        result.sent === 0
          ? "Everyone's already been welcomed — nothing to send."
          : `Sent the welcome email to ${result.sent} waitlist signup${result.sent === 1 ? "" : "s"}.`,
      );
    },
    onError: () => {
      setConfirmSendOpen(false);
    },
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-line"
            onClick={() => setConfirmSendOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Waitlist Welcome Emails
          </Button>
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
      </div>

      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send waitlist welcome emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends the "You're in. Welcome to Deadline." email to every
              waitlist signup who hasn't received it yet and agreed to be
              contacted. New signups get this automatically going forward —
              use this to backfill anyone who joined before this email
              existed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendWelcomeEmailsMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                sendWelcomeEmailsMutation.mutate();
              }}
            >
              {sendWelcomeEmailsMutation.isPending ? "Sending..." : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
