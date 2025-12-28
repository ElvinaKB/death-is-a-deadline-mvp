import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES } from "../../../config/routes.config";
import {
  StudentDetailResponse,
  ApproveStudentRequest,
  RejectStudentRequest,
} from "../../../types/student.types";
import { ApprovalStatus } from "../../../types/auth.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useApiQuery<StudentDetailResponse>({
    queryKey: [QUERY_KEYS.STUDENT_DETAIL, id],
    endpoint: getEndpoint(ENDPOINTS.STUDENT_DETAIL, { id: id! }),
    enabled: !!id,
  });

  const approveMutation = useApiMutation<void, ApproveStudentRequest>({
    endpoint: getEndpoint(ENDPOINTS.STUDENT_APPROVE, { id: id! }),
    method: "POST",
    onSuccess: () => {
      toast.success("Student approved successfully");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.STUDENT_DETAIL, id],
      });
      navigate(ROUTES.ADMIN_STUDENTS);
    },
  });

  const rejectMutation = useApiMutation<void, RejectStudentRequest>({
    endpoint: getEndpoint(ENDPOINTS.STUDENT_REJECT, { id: id! }),
    method: "POST",
    onSuccess: () => {
      toast.success("Student rejected");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.STUDENT_DETAIL, id],
      });
      navigate(ROUTES.ADMIN_STUDENTS);
    },
  });

  const handleApprove = async () => {
    const result = await Swal.fire({
      title: "Approve Student?",
      text: "This student will be able to access the marketplace",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed && id) {
      approveMutation.mutate({ id });
    }
  };

  const handleReject = async () => {
    const result = await Swal.fire({
      title: "Reject Student?",
      text: "You can optionally provide a reason",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Rejection reason (optional)",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed && id) {
      rejectMutation.mutate({ id, reason: result.value });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="custom" height={40} width={200} />
        <SkeletonLoader type="card" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Student not found</p>
        <Button
          onClick={() => navigate(ROUTES.ADMIN_STUDENTS)}
          className="mt-4"
        >
          Back to Students
        </Button>
      </div>
    );
  }

  const student = data.student;

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants = {
      [ApprovalStatus.APPROVED]: "bg-green-100 text-green-800",
      [ApprovalStatus.PENDING]: "bg-yellow-100 text-yellow-800",
      [ApprovalStatus.REJECTED]: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.ADMIN_STUDENTS)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Student Details</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{student.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(student.approvalStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="font-medium">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {student.studentIdUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Student ID Card</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={student.studentIdUrl}
                    alt="Student ID"
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.approvalStatus === ApprovalStatus.PENDING && (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve Student
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Student
                  </Button>
                </>
              )}
              {student.approvalStatus === ApprovalStatus.APPROVED && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Student has been approved
                </div>
              )}
              {student.approvalStatus === ApprovalStatus.REJECTED && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Student has been rejected
                  {/* show reason */}
                  {student.rejectionReason && (
                    <p className="mt-2">{student.rejectionReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Registered</p>
                  <p className="font-medium">
                    {new Date(student.createdAt).toLocaleString()}
                  </p>
                </div>
                {student.updatedAt !== student.createdAt && (
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(student.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
