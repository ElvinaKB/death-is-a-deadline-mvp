// List of common academic email domains
const ACADEMIC_DOMAINS = [
  ".edu",
  ".ac.uk",
  ".edu.au",
  ".ac.in",
  ".edu.pk",
  ".edu.bd",
  ".ac.nz",
  ".edu.sg",
  ".ac.za",
  ".edu.my",
  ".fi",
  // Add more as needed
];

/**
 * Check if email has an academic domain
 * Note: This is a frontend validation. Backend should verify against
 * a comprehensive database of accredited institutions
 */
export const isAcademicEmail = (email: string): boolean => {
  if (!email) return false;

  const lowerEmail = email.toLowerCase();

  return ACADEMIC_DOMAINS.some((domain) => lowerEmail.endsWith(domain));
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
