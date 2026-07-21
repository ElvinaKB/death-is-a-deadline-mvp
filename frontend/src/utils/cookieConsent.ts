export const COOKIE_CONSENT_KEY = "diad_cookie_consent";

export const COOKIE_CONSENT_EVENT = "diad-cookie-consent";

/** Dispatched by the footer's "Cookie Settings" link to reopen the banner
 * so a visitor can change an earlier choice at any time — a persistent
 * opt-out mechanism, not just a one-time popup, per CCPA/CPRA. */
export const COOKIE_CONSENT_REOPEN_EVENT = "diad-cookie-consent-reopen";

export function reopenCookieConsentBanner(): void {
  window.dispatchEvent(new Event(COOKIE_CONSENT_REOPEN_EVENT));
}

export type CookieConsentChoice = "accepted" | "rejected";

export function getCookieConsentChoice(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

export function hasCookieConsent(): boolean {
  return getCookieConsentChoice() === "accepted";
}

export function setCookieConsentAccepted(): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function setCookieConsentRejected(): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

/** Global Privacy Control — a legally binding opt-out signal under CCPA/CPRA. */
export function hasGpcSignal(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
