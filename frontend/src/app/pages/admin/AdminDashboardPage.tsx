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
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Approved",
      value: stats?.approvedStudents || 0,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Approval",
      value: stats?.pendingStudents || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Rejected",
      value: stats?.rejectedStudents || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
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
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Dashboard Under Development</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The admin dashboard is currently under development.
              <br />
              Please go to the Students page to approve or reject student
              registrations.
            </p>
            <Link to={ROUTES.ADMIN_STUDENTS}>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
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
