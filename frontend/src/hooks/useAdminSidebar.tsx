import { Users, LayoutDashboard, LucideIcon } from 'lucide-react';
import { ROUTES } from '../config/routes.config';

export interface SidebarItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export function useAdminSidebar(): SidebarItem[] {
  return [
    {
      title: 'Dashboard',
      path: ROUTES.ADMIN_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      title: 'Students',
      path: ROUTES.ADMIN_STUDENTS,
      icon: Users,
    },
    // Add more modules here as needed
  ];
}
