import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";
import { UserRole } from "../../../types/auth.types";
import { SearchBar } from "./SearchBar";
import { User } from "lucide-react";

interface HomeHeaderProps {
  showSearchBar?: boolean;
  onSearch?: () => void;
  variant?: "light" | "dark";
}

export function HomeHeader({
  showSearchBar = false,
  onSearch,
  variant = "light",
}: HomeHeaderProps) {
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

  const isDark = variant === "dark";

  return (
    <header
      className={`${
        isDark ? "bg-gray-900" : "bg-white border-b"
      } sticky top-0 z-50`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2 shrink-0">
          <div
            className={`w-10 h-10 ${
              isDark ? "bg-gray-800" : "bg-blue-100"
            } rounded-full flex items-center justify-center`}
          >
            <span className="text-2xl">🦍</span>
          </div>
          <div className="hidden sm:block">
            <h1
              className={`text-lg font-bold ${
                isDark ? "text-white" : "text-blue-900"
              } leading-tight`}
            >
              DEATH IS A DAALINE
            </h1>
            <p
              className={`text-xs ${
                isDark ? "text-gray-400" : "text-gray-500"
              } -mt-0.5`}
            >
              LIFE'S SHORT. TRAVEL NOW.
            </p>
          </div>
        </Link>

        {/* Search Bar - Centered */}
        {showSearchBar && (
          <div className="flex-1 flex justify-center px-4">
            <div className="w-full max-w-2xl">
              <SearchBar onSearch={onSearch} />
            </div>
          </div>
        )}

        {/* Auth Links */}
        <div className="flex items-center gap-4 shrink-0">
          {isAuthenticated && user ? (
            <>
              <Link
                to={getDashboardRoute()}
                className={`text-sm font-medium ${
                  isDark
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                {user.role === UserRole.STUDENT ? "My Bids" : "Dashboard"}
              </Link>
              <div
                className={`w-10 h-10 rounded-full ${
                  isDark
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-100 border-gray-300"
                } border-2 flex items-center justify-center`}
              >
                <User
                  className={`w-5 h-5 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </div>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                className={`text-sm font-medium ${
                  isDark
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                Sign In
              </Link>
              <Link
                to={ROUTES.SIGNUP}
                className={`text-sm font-medium ${
                  isDark
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
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
