declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    fbq: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
  }
}

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  SIGNUP_COMPLETED: "signup_completed",
  EDU_VERIFICATION_COMPLETED: "edu_verification_completed",
  BID_SUBMITTED: "bid_submitted",
  ACCEPTED_BID: "accepted_bid",
  REJECTED_BID: "rejected_bid",
} as const;

export function trackPageView(path: string, title?: string) {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title || document.title,
    });
  }
  if (typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, params);
  }
}

export function trackAnalyticsTest() {
  trackEvent("analytics_test", { source: "manual_test" });
  console.log(
    "[Analytics] Test event fired. Check GA4 DebugView and Clarity dashboard.",
  );
}

if (import.meta.env.DEV) {
  (window as Window & { trackAnalyticsTest?: () => void }).trackAnalyticsTest =
    trackAnalyticsTest;
}
