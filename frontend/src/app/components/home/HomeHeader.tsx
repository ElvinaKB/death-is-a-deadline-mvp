import { ChevronDown, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { PREVIEW_BYPASS } from "../../../config/previewBypass";
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
    navigate(PREVIEW_BYPASS ? ROUTES.HOME : ROUTES.LOGIN);
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
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-glass transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gold/25 text-gold text-xs font-semibold">
                    {user?.name ? getInitials(user.name) : "S"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-fg max-w-[120px] truncate">
                  {user?.name?.split(" ")[0] ?? "Account"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted shrink-0" />
              </button>
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
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            to={ROUTES.LOGIN}
            className="text-xs sm:text-sm font-medium text-muted hover:text-fg transition-colors whitespace-nowrap"
          >
            Sign In
          </Link>
          <Link
            to={ROUTES.SIGNUP}
            className="text-xs sm:text-sm font-medium px-2.5 sm:px-4 py-1.5 rounded-lg border border-gold/60 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
          >
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-bg border-b border-line sticky top-0 z-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-0">
        <div
          className={cn(
            "w-full min-w-0",
            showSearchBar
              ? "md:flex md:flex-col md:gap-0.5 md:shrink-0"
              : "md:flex md:items-center md:gap-3 md:w-auto",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <Link to={ROUTES.HOME} className="shrink-0">
              <span className="font-serif text-lg sm:text-xl md:text-2xl tracking-[0.14em] sm:tracking-[0.2em] text-gold leading-none">
                DEADLINE
              </span>
            </Link>
            <AuthLinks className="flex md:hidden shrink-0" />
          </div>
          <Link to={ROUTES.HOME} className="mt-0.5 block md:mt-0">
            <p
              className={cn(
                "text-[9px] sm:text-[10px] text-muted uppercase leading-snug",
                "tracking-[0.12em] sm:tracking-[0.14em]",
                !showSearchBar && "md:text-[10px]",
              )}
            >
              LIFE&apos;S SHORT. TRAVEL NOW.
            </p>
          </Link>
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col sm:flex-row items-stretch sm:items-center justify-between w-full min-w-0 md:px-4 pt-1 sm:pt-2 md:py-0 gap-2 sm:gap-0",
            !isHome && "hidden md:flex",
          )}
        >
          {showSearchBar && (
            <div className="flex-1 flex justify-center md:px-4 w-full min-w-0">
              <div className="w-full max-w-2xl min-w-0">
                <SearchBar onSearch={onSearch} />
              </div>
            </div>
          )}

          <AuthLinks
            className={cn("hidden md:flex", !isHome && "w-full justify-end")}
          />
        </div>
      </div>
    </header>
  );
}
