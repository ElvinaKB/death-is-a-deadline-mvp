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
import { ArrowLeft, Check, X, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Timeline, type TimelineItem } from "../../components/ui/timeline";
import { useBids } from "../../../hooks/useBids";
import { Bid, BidStatus } from "../../../types/bid.types";
import { DataTable } from "../../components/common/DataTable";
import { TableColumn } from "../../../types/api.types";
import { formatBookingDate } from "../../../utils/dateHelpers";

const BID_STATUS_COLORS: Record<BidStatus, string> = {
  [BidStatus.PENDING]: "bg-warning/20 text-warning hover:bg-warning/30",
  [BidStatus.ACCEPTED]: "bg-success/20 text-success hover:bg-success/30",
  [BidStatus.REJECTED]: "bg-danger/20 text-danger hover:bg-danger/30",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

interface TravelerBehavior {
  totalBids: number;
  bookings: number;
  rejected: number;
  cancelled: number;
  conversionRate: number;
  avgBid: number;
  minBid: number;
  maxBid: number;
  avgDiscountPct: number;
  avgLeadDays: number;
  avgBidsPerBooking: number | null;
  repeatHotels: number;
  abandoned: boolean;
  topCities: { city: string | null; count: number }[];
  hourHistogram: number[];
  dowHistogram: number[];
  // View metrics (present once migration 039 has run).
  totalViews?: number;
  viewedPlaces?: number;
  exploredNoBid?: number;
  viewToBidRate?: number | null;
}

// One labeled stat cell for the signals grid.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-semibold text-fg tabular-nums">{value}</p>
    </div>
  );
}

// Inline 24-bucket bar strip (no chart lib) for bid time-of-day.
function HourStrip({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  return (
    <div className="flex items-end gap-[2px] h-12" aria-hidden>
      {hours.map((c, h) => (
        <div
          key={h}
          className="flex-1 rounded-sm bg-gold/60"
          style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? 2 : 0 }}
          title={`${h}:00 — ${c} bid${c === 1 ? "" : "s"}`}
        />
      ))}
    </div>
  );
}

const bidHistoryColumns: TableColumn<Bid>[] = [
  {
    header: "Place",
    field: "placeId",
    render: (row) => row.place?.name || "N/A",
  },
  {
    header: "Dates",
    field: "checkInDate",
    render: (row) => (
      <span className="text-sm">
        {formatBookingDate(row.checkInDate, "MMM d")} –{" "}
        {formatBookingDate(row.checkOutDate, "MMM d, yyyy")}
      </span>
    ),
  },
  {
    header: "Bid",
    field: "bidPerNight",
    render: (row) => (
      <div className="text-sm">
        <p className="font-medium text-fg">{formatCurrency(row.totalAmount)}</p>
        <p className="text-muted">{formatCurrency(row.bidPerNight)}/night</p>
      </div>
    ),
  },
  {
    header: "Result",
    field: "status",
    render: (row) => (
      <div>
        <Badge className={BID_STATUS_COLORS[row.status]}>
          {row.status === BidStatus.ACCEPTED ? "Won" : row.status === BidStatus.REJECTED ? "Unsuccessful" : "Pending"}
        </Badge>
        {row.status === BidStatus.REJECTED && row.rejectionReason && (
          <p className="text-xs text-muted mt-1">{row.rejectionReason}</p>
        )}
      </div>
    ),
  },
  {
    header: "Placed",
    field: "createdAt",
    render: (row) => (
      <span className="text-sm text-muted">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

interface LoginEvent {
  loggedInAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

function describeLoginDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  let browser = "Unknown browser";
  if (/Edg\//.test(userAgent)) browser = "Edge";
  else if (/OPR\//.test(userAgent)) browser = "Opera";
  else if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent))
    browser = "Chrome";
  else if (/Firefox\//.test(userAgent)) browser = "Firefox";
  else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent))
    browser = "Safari";
  return `${browser} · ${isMobile ? "Mobile" : "Desktop"}`;
}

function describeLoginEvent(event: LoginEvent): string {
  const device = describeLoginDevice(event.userAgent);
  return event.ipAddress ? `${device} · ${event.ipAddress}` : device;
}

function buildTimeline(
  student: {
    createdAt: string;
    emailConfirmedAt?: string | null;
    approvalStatus: ApprovalStatus;
    updatedAt: string;
    rejectionReason?: string;
  },
  loginEvents: LoginEvent[] = [],
): TimelineItem[] {
  const dated: (TimelineItem & { timestamp: string })[] = [
    {
      id: "registered",
      title: "Registered",
      description: "Account created",
      timestamp: student.createdAt,
      status: "completed",
    },
  ];

  if (student.emailConfirmedAt) {
    dated.push({
      id: "email-verified",
      title: "Email Verified",
      description: "Email address confirmed",
      timestamp: student.emailConfirmedAt,
      status: "completed",
    });
  }

  if (student.approvalStatus === ApprovalStatus.APPROVED) {
    dated.push({
      id: "approved",
      title: "Account Approved",
      description: "Admin approved the student",
      timestamp: student.updatedAt,
      status: "completed",
    });
  } else if (student.approvalStatus === ApprovalStatus.REJECTED) {
    dated.push({
      id: "rejected",
      title: "Account Rejected",
      description: student.rejectionReason ?? "Admin rejected the student",
      timestamp: student.updatedAt,
      status: "error",
    });
  }

  loginEvents.forEach((event, index) => {
    dated.push({
      id: `login-${index}`,
      title: "Logged in",
      description: describeLoginEvent(event),
      timestamp: event.loggedInAt,
      status: "completed",
    });
  });

  dated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const items: TimelineItem[] = [...dated];

  if (!student.emailConfirmedAt) {
    items.push({
      id: "email-verified",
      title: "Email Verified",
      description: "Awaiting email verification",
      status: "pending",
    });
  }

  if (student.approvalStatus === ApprovalStatus.PENDING) {
    items.push({
      id: "approval-pending",
      title: "Awaiting Admin Approval",
      description: student.emailConfirmedAt
        ? "Email verified — pending admin review"
        : "Must verify email first",
      status: "pending",
    });
  }

  return items;
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useApiQuery<StudentDetailResponse>({
    queryKey: [QUERY_KEYS.STUDENT_DETAIL, id],
    endpoint: getEndpoint(ENDPOINTS.STUDENT_DETAIL, { id: id! }),
    enabled: !!id,
  });

  // Full bid history — both accepted and rejected, so the record isn't
  // just winners.
  const { data: bidsData, isLoading: bidsLoading } = useBids({
    studentId: id,
    limit: 100,
  });

  const { data: loginEventsData } = useApiQuery<{ events: LoginEvent[] }>({
    queryKey: [QUERY_KEYS.STUDENT_LOGIN_EVENTS, id],
    endpoint: getEndpoint(ENDPOINTS.STUDENT_LOGIN_EVENTS, { id: id! }),
    enabled: !!id,
  });

  const { data: behaviorData } = useApiQuery<{ behavior: TravelerBehavior | null }>({
    queryKey: [QUERY_KEYS.STUDENT_BEHAVIOR, id],
    endpoint: getEndpoint(ENDPOINTS.STUDENT_BEHAVIOR, { id: id! }),
    enabled: !!id,
  });
  const behavior = behaviorData?.behavior ?? null;

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
        <p className="text-muted-foreground">Traveler not found</p>
        <Button
          onClick={() => navigate(ROUTES.ADMIN_STUDENTS)}
          className="mt-4"
        >
          Back to Travelers
        </Button>
      </div>
    );
  }

  const student = data.student;

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants = {
      [ApprovalStatus.APPROVED]: "bg-success/20 text-success border-success/30",
      [ApprovalStatus.PENDING]: "bg-warning/20 text-warning border-warning/30",
      [ApprovalStatus.REJECTED]: "bg-error/20 text-error border-error/30",
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
          <h1 className="text-3xl font-bold text-fg">Traveler Details</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-2 border-white/10">
            <CardHeader>
              <CardTitle className="text-fg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Name</p>
                  <p className="font-medium text-fg">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Email</p>
                  <p className="font-medium text-fg">{student.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(student.approvalStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted">Email Verified</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {student.emailConfirmedAt ? (
                      <>
                        <MailCheck className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">Verified</span>
                      </>
                    ) : (
                      <>
                        <MailX className="h-4 w-4 text-error" />
                        <span className="text-sm font-medium text-error">Not verified</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted">Registered</p>
                  <p className="font-medium text-fg">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {student.linkedinProfileUrl && (
            <Card className="glass-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-fg">LinkedIn Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted mb-3">
                  LinkedIn confirmed this person owns the email above.
                  Click through to review their profile before approving.
                </p>
                <a
                  href={student.linkedinProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-brand hover:underline font-medium break-all"
                >
                  {student.linkedinProfileUrl}
                </a>
              </CardContent>
            </Card>
          )}

          {student.studentIdUrl && (
            <Card className="glass-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-fg">Verification ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                  <img
                    src={student.studentIdUrl}
                    alt="Student ID"
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {behavior && behavior.totalBids > 0 && (
            <Card className="glass-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-fg flex items-center gap-2">
                  Behavioral Signals
                  {behavior.abandoned && (
                    <Badge className="bg-danger/20 text-danger hover:bg-danger/30">
                      Abandoned — {behavior.totalBids} bids, never booked
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat
                    label="Conversion"
                    value={`${behavior.conversionRate}% · ${behavior.bookings}/${behavior.totalBids}`}
                  />
                  <Stat
                    label="Avg bids / booking"
                    value={
                      behavior.avgBidsPerBooking != null
                        ? String(behavior.avgBidsPerBooking)
                        : "—"
                    }
                  />
                  <Stat label="Rejected" value={String(behavior.rejected)} />
                  <Stat label="Avg bid" value={formatCurrency(behavior.avgBid)} />
                  <Stat
                    label="Avg discount vs retail"
                    value={`${behavior.avgDiscountPct}%`}
                  />
                  <Stat
                    label="Avg lead time"
                    value={`${behavior.avgLeadDays} days`}
                  />
                  {behavior.viewedPlaces != null && (
                    <Stat
                      label="Explored (viewed)"
                      value={`${behavior.viewedPlaces}${
                        behavior.exploredNoBid
                          ? ` · ${behavior.exploredNoBid} no bid`
                          : ""
                      }`}
                    />
                  )}
                  {behavior.viewToBidRate != null && (
                    <Stat
                      label="View → bid"
                      value={`${behavior.viewToBidRate}%`}
                    />
                  )}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                    Destinations
                  </p>
                  <p className="text-sm text-fg">
                    {behavior.topCities.length
                      ? behavior.topCities
                          .map((c) => `${c.city || "—"} (${c.count})`)
                          .join(", ")
                      : "—"}
                    {behavior.repeatHotels > 0 && (
                      <span className="text-muted">
                        {" "}· {behavior.repeatHotels} repeat hotel
                        {behavior.repeatHotels === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                    Bid time of day (local)
                  </p>
                  <HourStrip hours={behavior.hourHistogram} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-2 border-white/10">
            <CardHeader>
              <CardTitle className="text-fg">
                Bid History
                {bidsData && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    ({bidsData.total} total —{" "}
                    {bidsData.bids.filter((b) => b.status === BidStatus.ACCEPTED).length}{" "}
                    won,{" "}
                    {bidsData.bids.filter((b) => b.status === BidStatus.REJECTED).length}{" "}
                    unsuccessful)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={bidHistoryColumns}
                data={bidsData?.bids || []}
                loading={bidsLoading}
                emptyMessage="No bids placed yet"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {student.approvalStatus === ApprovalStatus.PENDING && (
            <Card className="glass-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-fg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-success hover:bg-success/90 disabled:opacity-50"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || !student.emailConfirmedAt}
                  title={!student.emailConfirmedAt ? "Student must verify their email before approval" : undefined}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Student
                </Button>
                {!student.emailConfirmedAt && (
                  <p className="text-xs text-error text-center">
                    Approval blocked — student has not verified their email
                  </p>
                )}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Student
                </Button>
              </CardContent>
            </Card>
          )}

          {student.approvalStatus === ApprovalStatus.REJECTED && (
            <Card className="glass-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-fg">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-sm text-muted">
                  Student has been rejected
                  {student.rejectionReason && (
                    <p className="mt-2 text-fg">{student.rejectionReason}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-2 border-white/10">
            <CardHeader>
              <CardTitle className="text-fg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline
                items={buildTimeline(student, loginEventsData?.events ?? [])}
                variant="compact"
                showTimestamps={true}
                timestampPosition="top"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
