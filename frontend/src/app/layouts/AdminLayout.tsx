import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { removeAuthToken } from "../../utils/tokenHelpers";
import { useAdminSidebar } from "../../hooks/useAdminSidebar";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { cn } from "../components/ui/utils";
import { ROUTES } from "../../config/routes.config";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const sidebarItems = useAdminSidebar();

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
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-raised border-r border-line flex flex-col">
        <div className="p-6 border-b border-line">
          <h1 className="text-2xl font-bold text-brand">Admin Panel</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-brand/20 text-brand font-medium"
                    : "text-muted hover:bg-glass"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-bg-raised border-b border-line flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              Welcome back, {user?.name}
            </h2>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar>
                  <AvatarFallback className="bg-brand/20 text-brand">
                    {user?.name ? getInitials(user.name) : "A"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-bg-raised border-line"
              align="end"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-fg">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              {/* <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem> */}
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
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
