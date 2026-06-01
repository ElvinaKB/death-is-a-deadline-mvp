export const COOKIE_CONSENT_KEY = "diad_cookie_consent";

export const COOKIE_CONSENT_EVENT = "diad-cookie-consent";

export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
}

export function setCookieConsentAccepted(): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
