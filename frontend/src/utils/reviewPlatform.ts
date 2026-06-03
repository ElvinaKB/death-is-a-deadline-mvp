import type { ReviewPlatform } from "../hooks/useTestimonials";

/** Prefer Google reviews for display links; fall back to Yelp. */
export function pickPreferredReviewPlatform(
  platforms: ReviewPlatform[],
): ReviewPlatform | null {
  if (!platforms.length) return null;
  const google = platforms.find((p) => p.source === "google");
  if (google?.url) return google;
  const yelp = platforms.find((p) => p.source === "yelp");
  return yelp?.url ? yelp : google ?? yelp ?? null;
}
