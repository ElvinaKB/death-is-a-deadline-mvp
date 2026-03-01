import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { HowItWorksModal } from "./HowItWorksModal";
import { cn } from "../ui/utils";

interface HomeHeaderProps {
  showSearchBar?: boolean;
  onSearch?: () => void;
  variant?: "light" | "dark";
  onHowItWorksClick?: () => void;
}

export function HomeHeader({
  showSearchBar = false,
  onSearch,
  variant = "light",
  onHowItWorksClick,
}: HomeHeaderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const isHome = location.pathname === ROUTES.HOME;

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

  const DashboardLink = ({ className }: { className?: string }) => (
    <Link
      to={getDashboardRoute()}
      className={cn(
        `hidden md:block text-sm font-medium text-muted hover:text-fg transition-colors`,
        className,
      )}
    >
      {user?.role === UserRole.STUDENT ? "My Bids" : "Dashboard"}
    </Link>
  );

  const AuthLinks = ({ className }: { className?: string }) => (
    <div className={cn(`flex items-center gap-4 shrink-0`, className)}>
      {isAuthenticated && user ? (
        <div className="flex items-center justify-between gap-2">
          <DashboardLink />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar>
                  <AvatarFallback className="bg-brand/20 text-brand">
                    {user?.name ? getInitials(user.name) : "S"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-bg md:bg-glass-2 border-line"
              align="end"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-fg">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="block md:hidden bg-line" />
              <DropdownMenuItem>
                <DashboardLink className={"block md:hidden"} />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-line" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-danger hover:bg-danger/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-medium text-muted hover:text-fg transition-colors"
          >
            Sign In
          </Link>
          <Link
            to={ROUTES.SIGNUP}
            className="text-sm font-medium text-muted hover:text-fg transition-colors"
          >
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-bg border-b border-line sticky top-0 z-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-4 w-full md:w-fit justify-between">
          <Link to={ROUTES.HOME} className="flex items-center gap-2 shrink-0">
            <div className="">
              <h1 className="text-lg font-bold text-fg leading-tight">
                DEATH IS A DEADLINE
              </h1>
              <p className="text-xs text-muted -mt-0.5">
                LIFE'S SHORT. TRAVEL NOW.
              </p>
            </div>
          </Link>
          <AuthLinks className="flex md:hidden" />
        </div>

        <div
          className={cn(
            "flex flex-1 items-center justify-between md:px-4 py-3",
            !isHome && "hidden md:flex",
          )}
        >
          {/* Search Bar - Centered */}
          {showSearchBar && (
            <div className="flex-1 flex justify-center md:px-4">
              <div className="w-full max-w-2xl">
                <SearchBar onSearch={onSearch} />
              </div>
            </div>
          )}

          {/* Auth Links */}
          <AuthLinks
            className={cn("hidden md:flex", !isHome && "w-full justify-end")}
          />
        </div>
      </div>
    </header>
  );
}
