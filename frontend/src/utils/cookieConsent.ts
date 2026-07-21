export const COOKIE_CONSENT_KEY = "diad_cookie_consent";

export const COOKIE_CONSENT_EVENT = "diad-cookie-consent";

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
