import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Users, UserCheck, Clock, XCircle } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { ROUTES } from "../../../config/routes.config";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalStudents: number;
  approvedStudents: number;
  pendingStudents: number;
  rejectedStudents: number;
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useApiQuery<DashboardStats>({
    queryKey: [QUERY_KEYS.STUDENTS_LIST, "stats"],
    endpoint: `${ENDPOINTS.STUDENTS_STATS}`,
  });

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: Users,
      color: "text-brand",
      bgColor: "bg-brand/20",
    },
    {
      title: "Approved",
      value: stats?.approvedStudents || 0,
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      title: "Pending Approval",
      value: stats?.pendingStudents || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/20",
    },
    {
      title: "Rejected",
      value: stats?.rejectedStudents || 0,
      icon: XCircle,
      color: "text-danger",
      bgColor: "bg-danger/20",
    },
  ];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-fg mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-fg mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-glass-2 border-line">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-fg">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card className="bg-glass-2 border-brand/30">
          <CardHeader>
            <CardTitle className="text-fg">
              Dashboard Under Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted mb-4">
              The admin dashboard is currently under development.
              <br />
              Please go to the Students page to approve or reject student
              registrations.
            </p>
            <Link to={ROUTES.ADMIN_STUDENTS}>
              <button
                className="btn-bid px-4 py-2 rounded font-medium"
                type="button"
              >
                Go to Students Page
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
