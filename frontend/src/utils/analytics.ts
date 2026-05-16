declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function trackPageView(path: string, title?: string) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// Debug helper — call trackAnalyticsTest() in browser console to verify setup
export function trackAnalyticsTest() {
  trackEvent("analytics_test", { source: "manual_test" });
  console.log("[Analytics] Test event fired. Check GA4 DebugView and Clarity dashboard.");
}

if (import.meta.env.DEV) {
  (window as any).trackAnalyticsTest = trackAnalyticsTest;
}
