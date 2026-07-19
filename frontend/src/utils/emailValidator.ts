// List of common academic email domains
const ACADEMIC_DOMAINS = [
  ".edu",
  // ".ac.uk",
  // ".edu.au",
  // ".ac.in",
  // ".edu.pk",
  // ".edu.bd",
  // ".ac.nz",
  // ".edu.sg",
  // ".ac.za",
  // ".edu.my",
  // ".fi",
  // Add more as needed
];

// .gov is government-issued and not publicly purchasable, so it's safe to
// auto-verify the same way as .edu
const GOV_DOMAINS = [".gov"];

// .org is open to anyone to purchase, so we do NOT trust it as a suffix.
// Instead we whitelist specific vetted nonprofit partner domains by exact
// match. Add new partners here as they're vetted.
const PARTNER_ORG_DOMAINS = ["hofoco.org", "safeplaceforyouth.org"];

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
 * Check if email has a .gov domain
 */
export const isGovEmail = (email: string): boolean => {
  if (!email) return false;

  const lowerEmail = email.toLowerCase();

  return GOV_DOMAINS.some((domain) => lowerEmail.endsWith(domain));
};

/**
 * Check if email belongs to a vetted nonprofit/organization partner domain.
 * Exact domain match only — unlike .edu/.gov, .org is publicly purchasable
 * so we don't trust the suffix, only specific approved domains.
 */
export const isPartnerOrgEmail = (email: string): boolean => {
  if (!email) return false;

  const domain = email.toLowerCase().split("@")[1] ?? "";

  return PARTNER_ORG_DOMAINS.includes(domain);
};

/**
 * Check if email qualifies for automatic approval (academic, government,
 * or a vetted partner organization domain)
 */
export const isAutoVerifiedEmail = (email: string): boolean =>
  isAcademicEmail(email) || isGovEmail(email) || isPartnerOrgEmail(email);

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
