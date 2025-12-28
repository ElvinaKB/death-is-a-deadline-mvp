export const ENDPOINTS = {
  // Auth
  LOGIN: "/api/auth/login",
  SIGNUP: "/api/auth/signup",
  LOGOUT: "/api/auth/logout",
  VERIFY_EMAIL: "/api/auth/verify-email",

  // Students
  STUDENTS_LIST: "/api/students",
  STUDENT_DETAIL: "/api/students/:id",
  STUDENT_APPROVE: "/api/students/:id/approve",
  STUDENT_REJECT: "/api/students/:id/reject",
  STUDENT_UPLOAD_ID: "/api/students/upload-id",
  STUDENTS_STATS: "/api/students/stats",

  // Profile
  PROFILE: "/api/profile",
  UPDATE_PROFILE: "/api/profile/update",
} as const;

export const getEndpoint = (
  endpoint: string,
  params?: Record<string, string | number>
) => {
  if (!params) return endpoint;

  let finalEndpoint = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    finalEndpoint = finalEndpoint.replace(`:${key}`, String(value));
  });

  return finalEndpoint;
};
