import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ShieldAlert } from "lucide-react";
import { ROUTES } from "../../config/routes.config";

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center">
        <ShieldAlert className="h-16 w-16 mx-auto text-danger mb-4" />
        <h1 className="text-4xl font-bold text-fg mb-2">403</h1>
        <p className="text-lg text-muted mb-6">
          You don't have permission to access this page
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            className="border-line text-fg hover:bg-glass"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button onClick={() => navigate(ROUTES.LOGIN)} className="btn-bid">
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
