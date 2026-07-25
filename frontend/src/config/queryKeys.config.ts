export const QUERY_KEYS = {
  // Auth
  AUTH_USER: "authUser",

  // Students
  STUDENTS_LIST: "studentsList",
  STUDENT_DETAIL: "studentDetail",
  STUDENT_LOGIN_EVENTS: "studentLoginEvents",
  STUDENT_BEHAVIOR: "studentBehavior",
  STUDENTS_PENDING: "studentsPending",
  HOTEL_PLACES: "hotel-places",
  HOTEL_DASHBOARD_STATS: "hotel-dashboard-stats",
  // Profile
  PROFILE: "profile",
  PROFILE_WISHLIST_TALLY: "profileWishlistTally",

  // places
  PLACES: ["places"],
  PLACE: (id: string) => ["place", id],

  // Testimonials & Review Platforms
  TESTIMONIALS: "testimonials",
  REVIEW_PLATFORMS: "reviewPlatforms",

  // Newsletter
  NEWSLETTER_SUBSCRIBERS: "newsletterSubscribers",

  // Hotel sign-ups
  HOTEL_APPLICATIONS: "hotelApplications",

  // Geo (silent proximity hint)
  GEO_HINT: "geoHint",
} as const;

export const createQueryKey = (
  key: string,
  params?: Record<string, unknown>,
) => {
  if (!params) return [key];
  return [key, params];
};
