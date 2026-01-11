import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logoImg from "../../../assets/logo.png";
import { ROUTES } from "../../../config/routes.config";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { UserRole } from "../../../types/auth.types";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SearchBar } from "./SearchBar";
import { logout } from "../../../store/slices/authSlice";
import { removeAuthToken } from "../../../utils/tokenHelpers";

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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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

  const handleLogout = () => {
    dispatch(logout());
    removeAuthToken();
    navigate(ROUTES.LOGIN);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
            }  flex items-center justify-center overflow-hidden`}
          >
            <img
              src={logoImg}
              alt="Logo"
              className="w-full h-full object-cover"
            />
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user?.name ? getInitials(user.name) : "S"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  {/* <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
