export const ROUTES = {
  // Auth routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  RESUBMIT: "/resubmit",

  // Student routes
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_MARKETPLACE: "/student/marketplace",

  // Hotel Owner routes
  HOTEL_DASHBOARD: "/hotel/dashboard",

  // Admin routes
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_STUDENTS: "/admin/students",
  ADMIN_STUDENT_DETAIL: "/admin/students/:id",

  // Utility
  NOT_FOUND: "/404",
  UNAUTHORIZED: "/unauthorized",
  REDIRECT: "/redirect",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

export const getRoute = (
  route: string,
  params?: Record<string, string | number>
) => {
  if (!params) return route;

  let finalRoute = route;
  Object.entries(params).forEach(([key, value]) => {
    finalRoute = finalRoute.replace(`:${key}`, String(value));
  });

  return finalRoute;
};
