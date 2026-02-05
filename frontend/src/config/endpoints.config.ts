export const ENDPOINTS = {
  // Auth
  LOGIN: "/api/auth/login",
  SIGNUP: "/api/auth/signup",
  LOGOUT: "/api/auth/logout",
  VERIFY_EMAIL: "/api/auth/verify-email",
  RESUBMIT_ID: "/api/auth/resubmit",
  FORGOT_PASSWORD: "/api/auth/forgot-password",
  RESET_PASSWORD: "/api/auth/reset-password",

  // Students
  STUDENTS_LIST: "/api/students",
  STUDENT_DETAIL: "/api/students/:id",
  STUDENT_APPROVE: "/api/students/:id/approve",
  STUDENT_REJECT: "/api/students/:id/reject",
  STUDENT_UPLOAD_ID: "/api/students/upload-id",
  STUDENTS_STATS: "/api/students/stats",

  // Places
  PLACES_LIST: "/api/places",
  PLACES_PUBLIC: "/api/places/public",
  PLACES_PRICE_RANGE: "/api/places/public/price-range",
  PLACE_DETAIL: "/api/places/:id",
  PLACE_PUBLIC_DETAIL: "/api/places/public/:id",
  PLACE_CREATE: "/api/places",
  PLACE_UPDATE: "/api/places/:id",
  PLACE_STATUS: "/api/places/:id/status",
  PLACE_DELETE: "/api/places/:id",

  // Bids
  BIDS_CREATE: "/api/bids",
  BIDS_MY: "/api/bids/my",
  BID_FOR_PLACE: "/api/bids/place/:placeId",
  BID_DETAIL: "/api/bids/:id",
  BIDS_LIST: "/api/bids",
  BID_STATUS: "/api/bids/:id/status",
  BID_PAYOUT: "/api/bids/:id/payout",

  // Payments
  PAYMENT_CREATE_INTENT: "/api/payments/create-intent",
  PAYMENT_FOR_BID: "/api/payments/bid/:bidId",
  PAYMENT_CONFIRM: "/api/payments/:id/confirm",
  PAYMENTS_LIST: "/api/payments",
  PAYMENT_DETAIL: "/api/payments/:id",
  PAYMENT_CAPTURE: "/api/payments/:id/capture",
  PAYMENT_CANCEL: "/api/payments/:id/cancel",

  // Profile
  PROFILE: "/api/profile",
  UPDATE_PROFILE: "/api/profile/update",

  // Testimonials
  TESTIMONIALS_LIST: "/api/testimonials",
  TESTIMONIAL_CREATE: "/api/testimonials",
  TESTIMONIAL_UPDATE: "/api/testimonials/:id",
  TESTIMONIAL_DELETE: "/api/testimonials/:id",

  // Review Platforms
  REVIEW_PLATFORMS_LIST: "/api/testimonials/review-platforms",
  REVIEW_PLATFORM_CREATE: "/api/testimonials/review-platforms",
  REVIEW_PLATFORM_UPDATE: "/api/testimonials/review-platforms/:id",
  REVIEW_PLATFORM_DELETE: "/api/testimonials/review-platforms/:id",
} as const;

export const getEndpoint = (
  endpoint: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return endpoint;

  let finalEndpoint = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    finalEndpoint = finalEndpoint.replace(`:${key}`, String(value));
  });

  return finalEndpoint;
};
