// Remember the hotel page a visitor was on, so signing in or finishing
// sign-up (even from the email link in another tab) lands back on it
// instead of the marketplace. Expires after a few hours.
const KEY = "deadline:returnTo";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function rememberReturnTo(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    /* storage blocked — fall back to the marketplace */
  }
}

export function clearReturnTo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** The remembered path (once), or null. */
export function takeReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !path.startsWith("/") || !at || Date.now() - at > MAX_AGE_MS) return null;
    return path;
  } catch {
    return null;
  }
}
