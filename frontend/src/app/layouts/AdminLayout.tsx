import { Building2, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import { useAdminSidebar } from "../../hooks/useAdminSidebar";
import { useHotel } from "../../hooks/useHotel";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { UserRole } from "../../types/auth.types";
import { removeAuthToken } from "../../utils/tokenHelpers";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../components/ui/utils";
import { Hotel } from "../../store/slices/hotelSlice";
import { useQueryClient } from "@tanstack/react-query";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const sidebarItems = useAdminSidebar();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === UserRole.ADMIN;
  const isHotelAdmin = user?.role === UserRole.HOTEL_OWNER;

  const queryClient = useQueryClient();

  // Hotel selector — only relevant for hotel admins
  // `user.hotels` is assumed to be the list of hotels the hotel admin has access to.
  // Adjust the field name to match your actual auth user shape.
  const { selectedHotel, setHotel } = useHotel();

  const onSelectHotel = (hotel: Hotel) => {
    setHotel(hotel);
    queryClient.clear();
  };

  const handleLogout = () => {
    dispatch(logout());
    removeAuthToken();
    navigate(ROUTES.LOGIN);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-line">
        <h1 className="text-xl font-bold text-brand">
          {!isAdmin && "Hotel "}Admin Panel
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-brand/20 text-brand font-medium"
                  : "text-muted hover:bg-glass",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-bg md:bg-bg-raised border-r border-line flex flex-col transition-transform duration-200",
          "lg:static lg:translate-x-0 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 sm:h-16 bg-bg-raised border-b border-line flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-muted hover:text-fg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-sm sm:text-base font-semibold text-fg truncate">
              Welcome back, {user?.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Hotel selector — only shown for hotel admins with multiple hotels */}
            {isHotelAdmin && user?.places && user.places.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 gap-2 border-line bg-glass text-fg text-sm max-w-[180px]"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-brand" />
                    <span className="truncate">
                      {selectedHotel?.name ?? "Select Hotel"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-52 bg-glass-2 border-line"
                  align="end"
                >
                  <DropdownMenuLabel className="text-xs text-muted">
                    Your Places
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-line" />
                  {user.places.map((hotel) => (
                    <DropdownMenuItem
                      key={hotel.id}
                      onClick={() => onSelectHotel(hotel)}
                      className={cn(
                        "gap-2 cursor-pointer",
                        selectedHotel?.id === hotel.id
                          ? "text-brand font-medium"
                          : "text-fg",
                      )}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      {hotel.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User avatar / logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0"
                >
                  <Avatar>
                    <AvatarFallback className="bg-brand/20 text-brand text-sm">
                      {user?.name ? getInitials(user.name) : "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-glass-2 border-line"
                align="end"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-fg">{user?.name}</p>
                    <p className="text-xs text-muted">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
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
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
