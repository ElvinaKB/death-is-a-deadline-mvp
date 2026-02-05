export const QUERY_KEYS = {
  // Auth
  AUTH_USER: "authUser",

  // Students
  STUDENTS_LIST: "studentsList",
  STUDENT_DETAIL: "studentDetail",
  STUDENTS_PENDING: "studentsPending",

  // Profile
  PROFILE: "profile",

  // places
  PLACES: ["places"],
  PLACE: (id: string) => ["place", id],

  // Testimonials & Review Platforms
  TESTIMONIALS: "testimonials",
  REVIEW_PLATFORMS: "reviewPlatforms",
} as const;

export const createQueryKey = (
  key: string,
  params?: Record<string, unknown>,
) => {
  if (!params) return [key];
  return [key, params];
};
