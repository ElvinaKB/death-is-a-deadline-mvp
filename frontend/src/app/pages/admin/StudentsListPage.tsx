import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES } from "../../../config/routes.config";
import { StudentsListResponse } from "../../../types/student.types";
import { ApprovalStatus } from "../../../types/auth.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { Eye, Ban, RotateCcw } from "lucide-react";
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

type StudentRow = StudentsListResponse["students"][0];

export function StudentsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<ApprovalStatus | "ALL">("ALL");
  const [banTarget, setBanTarget] = useState<StudentRow | null>(null);
  const [banReason, setBanReason] = useState("");

  const { data, isLoading } = useApiQuery<StudentsListResponse>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, currentPage, filter],
    endpoint: ENDPOINTS.STUDENTS_LIST,
    params: {
      page: currentPage,
      limit: 10,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  const banMutation = useApiMutation<{ message: string }, { id: string; reason?: string }>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.STUDENT_BAN, { id: vars.id }),
    onSuccess: () => {
      toast.success("Traveler banned");
      setBanTarget(null);
      setBanReason("");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
    },
  });

  const unbanMutation = useApiMutation<{ message: string }, { id: string }>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.STUDENT_UNBAN, { id: vars.id }),
    onSuccess: () => {
      toast.success("Traveler unbanned");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
    },
  });

  const getStatusBadge = (row: StudentRow) => {
    if (row.banned) {
      return <Badge className="bg-danger/20 text-danger hover:bg-danger/30">Banned</Badge>;
    }

    const variants = {
      [ApprovalStatus.APPROVED]:
        "bg-success/20 text-success hover:bg-success/30",
      [ApprovalStatus.PENDING]:
        "bg-warning/20 text-warning hover:bg-warning/30",
      [ApprovalStatus.REJECTED]: "bg-danger/20 text-danger hover:bg-danger/30",
    };

    return (
      <Badge className={variants[row.approvalStatus]}>
        {row.approvalStatus.charAt(0) + row.approvalStatus.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const columns: TableColumn<StudentRow>[] = [
    {
      header: "Name",
      field: "name",
    },
    {
      header: "Email",
      field: "email",
    },
    {
      header: "Status",
      field: "approvalStatus",
      render: (row) => getStatusBadge(row),
    },
    {
      header: "Registered",
      field: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      field: "id",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(ROUTES.ADMIN_STUDENT_DETAIL.replace(":id", row.id))
            }
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          {row.banned ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-success hover:text-success"
              disabled={unbanMutation.isPending}
              onClick={() => unbanMutation.mutate({ id: row.id })}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Unban
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => setBanTarget(row)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Ban
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Travelers</h1>
          <p className="text-muted mt-1">
            Manage traveler registrations, approvals, and bans
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="ALL"
        value={filter}
        onValueChange={(v) => setFilter(v as ApprovalStatus | "ALL")}
      >
        <TabsList className="bg-glass border border-line">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value={ApprovalStatus.PENDING}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value={ApprovalStatus.APPROVED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value={ApprovalStatus.REJECTED}
            className="data-[state=active]:bg-brand data-[state=active]:text-white"
          >
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card className="bg-glass-2 border-line">
            <CardHeader>
              <CardTitle className="text-fg">Traveler List</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={data?.students || []}
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
                emptyMessage="No travelers found"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!banTarget} onOpenChange={(open) => !open && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {banTarget?.name || banTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to log in or bid again, but their existing
              record, bids, and bookings stay intact — this doesn't delete
              anything. You can unban them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason (optional, for your records)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-glass border-line text-fg"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBanReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              disabled={banMutation.isPending}
              onClick={() => {
                if (banTarget) {
                  banMutation.mutate({ id: banTarget.id, reason: banReason || undefined });
                }
              }}
            >
              Ban traveler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
