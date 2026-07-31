export const ROUTES = {
  // Auth routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  SIGNUP_SUCCESS: "/signup/success",
  LINKEDIN_CALLBACK: "/auth/linkedin/callback",
  HOTEL_SIGNUP: "/hotel/signup",
  RESUBMIT: "/resubmit",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  HOME: "/",
  WAITLIST: "/waitlist",
  HOTELS_LANDING: "/hotels",
  HOTELS_JOIN: "/hotels/join",
  PUBLIC_PLACE_DETAIL: "/:slug",

  // Student routes
  STUDENT_DASHBOARD: "/member/dashboard",
  STUDENT_MY_BIDS: "/member/my-bids",
  STUDENT_CHECKOUT: "/member/checkout/:bidId",
  STUDENT_PROFILE: "/member/profile",
  STUDENT_SAVED_HOTELS: "/member/saved-hotels",
  STUDENT_WISHLIST: "/member/wishlist",
  STUDENT_PAYMENT_METHODS: "/member/payment-methods",
  STUDENT_INVITE_FRIENDS: "/member/invite-friends",
  STUDENT_SETTINGS: "/member/settings",

  // Legacy paths kept only to redirect old links (e.g. already-sent
  // booking confirmation emails) to their new /member equivalents.
  LEGACY_STUDENT_MARKETPLACE_DETAIL: "/student/marketplace/:slug",
  LEGACY_STUDENT_MY_BIDS: "/student/my-bids",
  LEGACY_STUDENT_CHECKOUT: "/student/checkout/:bidId",
  LEGACY_STUDENT_PROFILE: "/student/profile",

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
  ADMIN_NEWSLETTER: "/admin/newsletter",
  ADMIN_HOTEL_APPLICATIONS: "/admin/hotel-applications",
  ADMIN_REFERRALS: "/admin/referrals",
  ADMIN_WISHLIST: "/admin/wishlist",

  // Legal
  TERMS: "/terms",
  PRIVACY: "/privacy",
  ACCESSIBILITY: "/accessibility",
  CONTACT: "/contact",

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
