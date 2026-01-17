import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { StudentsListResponse } from "../../../types/student.types";
import { ApprovalStatus } from "../../../types/auth.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Eye } from "lucide-react";
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

type StudentRow = StudentsListResponse["students"][0];

export function StudentsListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<ApprovalStatus | "ALL">("ALL");

  const { data, isLoading } = useApiQuery<StudentsListResponse>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, currentPage, filter],
    endpoint: ENDPOINTS.STUDENTS_LIST,
    params: {
      page: currentPage,
      limit: 10,
      ...(filter !== "ALL" ? { status: filter } : {}),
    },
  });

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants = {
      [ApprovalStatus.APPROVED]:
        "bg-success/20 text-success hover:bg-success/30",
      [ApprovalStatus.PENDING]:
        "bg-warning/20 text-warning hover:bg-warning/30",
      [ApprovalStatus.REJECTED]: "bg-danger/20 text-danger hover:bg-danger/30",
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
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
      render: (row) => getStatusBadge(row.approvalStatus),
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Students</h1>
          <p className="text-muted mt-1">
            Manage student registrations and approvals
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
              <CardTitle className="text-fg">Student List</CardTitle>
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
                emptyMessage="No students found"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
