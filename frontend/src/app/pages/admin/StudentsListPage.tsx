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
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Eye, Ban, RotateCcw, Trash2, Download, Plus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
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

function downloadCsv(students: StudentRow[]) {
  const rows = [
    ["Name", "Email", "Status", "Banned", "Verified Via", "LinkedIn URL", "Registered"],
    ...students.map((s) => [
      s.name || "",
      s.email,
      s.approvalStatus,
      s.banned ? "Yes" : "No",
      s.verifiedVia || "",
      s.linkedinProfileUrl || "",
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
  a.download = `travelers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<ApprovalStatus | "ALL">("ALL");
  const [banTarget, setBanTarget] = useState<StudentRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addLinkedinUrl, setAddLinkedinUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<StudentsListResponse>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, currentPage, filter],
    endpoint: ENDPOINTS.STUDENTS_LIST,
    params: {
      page: currentPage,
      limit: 10,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  // Full unfiltered list, just for CSV export
  const { data: allData } = useApiQuery<StudentsListResponse>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, "export-all"],
    endpoint: ENDPOINTS.STUDENTS_LIST,
    params: { page: 1, limit: 10000 },
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

  const deleteMutation = useApiMutation<{ message: string }, { id: string }>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.STUDENT_DELETE, { id: vars.id }),
    method: "DELETE",
    onSuccess: () => {
      toast.success("Traveler deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
    },
  });

  const addMutation = useApiMutation<
    { message: string },
    { name: string; email: string; linkedinProfileUrl?: string }
  >({
    endpoint: ENDPOINTS.STUDENT_CREATE,
    showErrorToast: false,
    onSuccess: () => {
      toast.success("Traveler added and pre-approved");
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddLinkedinUrl("");
      setAddError(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
    },
    onError: (error) => {
      setAddError(error.message || "Something went wrong.");
    },
  });

  const handleAddSubmit = () => {
    setAddError(null);
    if (!addName.trim()) {
      setAddError("Name is required.");
      return;
    }
    if (!addEmail.trim()) {
      setAddError("Email is required.");
      return;
    }
    addMutation.mutate({
      name: addName.trim(),
      email: addEmail.trim(),
      linkedinProfileUrl: addLinkedinUrl.trim() || undefined,
    });
  };

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
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-line"
            disabled={!allData?.students?.length}
            onClick={() => downloadCsv(allData?.students || [])}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="btn-bid" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Traveler
          </Button>
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

      {/* Ban confirmation */}
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {deleteTarget?.name || deleteTarget?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone — it removes their account and their bid
              history entirely. Use this for test accounts or bounced
              signups, not real travelers. For real travelers you want to
              block, use Ban instead — it keeps their record intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id });
                }
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add traveler */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Traveler</DialogTitle>
            <DialogDescription>
              Manually add someone as already-verified — skips ID upload and
              LinkedIn review entirely. They'll get an email to set their
              password and log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addName" className="text-fg">
                Full Name
              </Label>
              <Input
                id="addName"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="bg-glass border-line text-fg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addEmail" className="text-fg">
                Email
              </Label>
              <Input
                id="addEmail"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="bg-glass border-line text-fg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addLinkedinUrl" className="text-fg">
                LinkedIn URL <span className="text-muted font-normal">(optional)</span>
              </Label>
              <Input
                id="addLinkedinUrl"
                type="url"
                placeholder="https://www.linkedin.com/in/..."
                value={addLinkedinUrl}
                onChange={(e) => setAddLinkedinUrl(e.target.value)}
                className="bg-glass border-line text-fg"
              />
            </div>
            {addError && (
              <p className="text-sm text-danger" role="alert">
                {addError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="btn-bid"
              disabled={addMutation.isPending}
              onClick={handleAddSubmit}
            >
              {addMutation.isPending ? "Adding..." : "Add Traveler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
