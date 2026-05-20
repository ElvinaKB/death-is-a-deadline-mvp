/** See frontend/PREVIEW_BYPASS_REVERT.txt */
export const PREVIEW_BYPASS =
  import.meta.env.VITE_PREVIEW_BYPASS === "true";

const PREVIEW_LOGOUT_KEY = "preview_bypass_logged_out";

/** Set when user logs out in preview mode (stops auto re-login). */
export function setPreviewBypassLoggedOut(): void {
  try {
    sessionStorage.setItem(PREVIEW_LOGOUT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPreviewBypassLoggedOut(): void {
  try {
    sessionStorage.removeItem(PREVIEW_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function isPreviewBypassLoggedOut(): boolean {
  try {
    return sessionStorage.getItem(PREVIEW_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}
