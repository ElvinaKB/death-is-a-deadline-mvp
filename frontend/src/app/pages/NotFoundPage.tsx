import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { FileQuestion } from "lucide-react";
import { ROUTES } from "../../config/routes.config";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center">
        <FileQuestion className="h-16 w-16 mx-auto text-muted mb-4" />
        <h1 className="text-4xl font-bold text-fg mb-2">404</h1>
        <p className="text-lg text-muted mb-6">Page not found</p>
        <Link to={ROUTES.LOGIN}>
          <Button className="btn-bid">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
