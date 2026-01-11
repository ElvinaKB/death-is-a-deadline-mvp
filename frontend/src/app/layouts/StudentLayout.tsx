import { Link, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { removeAuthToken } from "../../utils/tokenHelpers";
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
import { LogOut, User, ShoppingBag, Store } from "lucide-react";
import { cn } from "../components/ui/utils";
import { ROUTES } from "../../config/routes.config";
import { useNavigate } from "react-router-dom";

export function StudentLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}
