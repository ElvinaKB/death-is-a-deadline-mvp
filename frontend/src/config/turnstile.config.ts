/**
 * Cloudflare Turnstile — frontend config.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 *
 * Official dummy site key (always passes, works on localhost without dashboard setup):
 *   1x00000000000000000000AA
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export function getTurnstileSiteKey(): string {
  const fromEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  if (fromEnv) return fromEnv;

  if (import.meta.env.VITE_TURNSTILE_DEMO === "false") {
    return "";
  }

  // Local dev / explicit demo: show real Turnstile UI with always-pass test key
  if (import.meta.env.DEV || import.meta.env.VITE_TURNSTILE_DEMO === "true") {
    return TURNSTILE_TEST_SITE_KEY;
  }

  return "";
}

export function isTurnstileEnabled(): boolean {
  return getTurnstileSiteKey().length > 0;
}

/** Using Cloudflare test key or VITE_TURNSTILE_DEMO — no backend secret required. */
export function isTurnstileDemoMode(): boolean {
  const key = getTurnstileSiteKey();
  if (!key) return false;
  if (import.meta.env.VITE_TURNSTILE_DEMO === "true") return true;
  if (import.meta.env.DEV && key === TURNSTILE_TEST_SITE_KEY) return true;
  return false;
}

/** Contact form skips API and shows success after Turnstile (frontend-only preview). */
export function isContactDemoMode(): boolean {
  if (import.meta.env.VITE_CONTACT_DEMO_MODE === "false") return false;
  if (import.meta.env.VITE_CONTACT_DEMO_MODE === "true") return true;
  return isTurnstileDemoMode();
}
