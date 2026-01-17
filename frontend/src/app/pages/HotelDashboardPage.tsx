import { useAppSelector } from "../../store/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Construction } from "lucide-react";

export function HotelDashboardPage() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fg">Welcome, {user?.name}!</h1>
          <p className="text-muted mt-2">
            Manage your hotel listings and bookings
          </p>
        </div>

        <Card className="text-center py-16 glass-2 border-line">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mb-4">
              <Construction className="h-8 w-8 text-brand" />
            </div>
            <CardTitle className="text-2xl text-fg">
              Under Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">
              The hotel management dashboard is currently being built. Check
              back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
