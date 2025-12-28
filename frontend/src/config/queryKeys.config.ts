export const QUERY_KEYS = {
  // Auth
  AUTH_USER: 'authUser',
  
  // Students
  STUDENTS_LIST: 'studentsList',
  STUDENT_DETAIL: 'studentDetail',
  STUDENTS_PENDING: 'studentsPending',
  
  // Profile
  PROFILE: 'profile',
} as const;

export const createQueryKey = (key: string, params?: Record<string, unknown>) => {
  if (!params) return [key];
  return [key, params];
};
