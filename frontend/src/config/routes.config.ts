export const ROUTES = {
  // Auth routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  HOTEL_SIGNUP: "/hotel/signup",
  RESUBMIT: "/resubmit",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  HOME: "/",
  PUBLIC_PLACE_DETAIL: "/student/marketplace/:id",

  // Student routes
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_MY_BIDS: "/student/my-bids",
  STUDENT_CHECKOUT: "/student/checkout/:bidId",

  // Hotel Owner routes
  HOTEL_DASHBOARD: "/hotel/dashboard",
  HOTEL_PLACE: "/hotel/place",
  HOTEL_BIDS: "/hotel/bids",
  HOTEL_PLACES_EDIT: "/hotel/places/:id/edit",
  HOTEL_PLACES: "/hotel/places",

  // Admin routes
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_STUDENTS: "/admin/students",
  ADMIN_STUDENT_DETAIL: "/admin/students/:id",
  ADMIN_PLACES: "/admin/places",
  ADMIN_PLACES_NEW: "/admin/places/new",
  ADMIN_PLACES_EDIT: "/admin/places/:id/edit",
  ADMIN_PLACES_TESTIMONIALS: "/admin/places/:id/testimonials",
  ADMIN_BIDS: "/admin/bids",

  // Utility
  NOT_FOUND: "/404",
  UNAUTHORIZED: "/unauthorized",
  REDIRECT: "/redirect",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

export const getRoute = (
  route: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return route;

  let finalRoute = route;
  Object.entries(params).forEach(([key, value]) => {
    finalRoute = finalRoute.replace(`:${key}`, String(value));
  });

  return finalRoute;
};
