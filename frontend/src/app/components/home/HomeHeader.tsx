import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";
import { UserRole } from "../../../types/auth.types";
import { Button } from "../ui/button";

export function HomeHeader() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const getDashboardRoute = () => {
    if (!user) return ROUTES.HOME;
    switch (user.role) {
      case UserRole.ADMIN:
        return ROUTES.ADMIN_DASHBOARD;
      case UserRole.HOTEL_OWNER:
        return ROUTES.HOTEL_DASHBOARD;
      default:
        return ROUTES.STUDENT_MY_BIDS;
    }
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🦍</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-blue-900 leading-tight">
              DEATH IS A DAALINE
            </h1>
            <p className="text-xs text-gray-500 -mt-0.5">
              LIFE'S SHORT. TRAVEL NOW.
            </p>
          </div>
        </Link>

        {/* Auth Links */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <Link
                to={getDashboardRoute()}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {user.role === UserRole.STUDENT ? "My Bids" : "Dashboard"}
              </Link>
              <span className="text-sm text-gray-500">{user.name}</span>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                to={ROUTES.SIGNUP}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
