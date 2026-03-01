import {
  Users,
  LayoutDashboard,
  LucideIcon,
  MapPin,
  Gavel,
} from "lucide-react";
import { ROUTES } from "../config/routes.config";
import { useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { UserRole } from "../types/auth.types";

export interface SidebarItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export function useAdminSidebar(): SidebarItem[] {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const adminRoutes = [
    {
      title: "Dashboard",
      path: ROUTES.ADMIN_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      title: "Students",
      path: ROUTES.ADMIN_STUDENTS,
      icon: Users,
    },
    {
      title: "Places",
      path: ROUTES.ADMIN_PLACES,
      icon: MapPin,
    },
    {
      title: "Bids",
      path: ROUTES.ADMIN_BIDS,
      icon: Gavel,
    },
    // Add more modules here as needed
  ];

  const hotelOwnerRoutes = [
    {
      title: "Dashboard",
      path: ROUTES.HOTEL_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      title: "Place Details",
      path: ROUTES.HOTEL_PLACE,
      icon: MapPin,
    },
    {
      title: "Bids",
      path: ROUTES.HOTEL_BIDS,
      icon: Gavel,
    },
  ];

  return isAdmin ? adminRoutes : hotelOwnerRoutes;
}
