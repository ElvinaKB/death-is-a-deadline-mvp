import { Place } from "../types/place.types";

export interface GeoHint {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasCoords(
  p: Place,
): p is Place & { latitude: number; longitude: number } {
  return (
    typeof p.latitude === "number" &&
    typeof p.longitude === "number" &&
    !Number.isNaN(p.latitude) &&
    !Number.isNaN(p.longitude)
  );
}

/**
 * Reorder the marketplace so the viewer's nearest listings come first, which
 * naturally groups by city for well-separated metros (LA → SD → SF). Purely a
 * reorder — every listing is still returned so the full inventory stays
 * visible. Returns the input order unchanged when we have no usable location
 * hint (e.g. local dev, or Vercel didn't resolve an IP).
 *
 * NOTE: the public places API currently paginates (12/page) ordered by retail
 * price, so this sorts within the returned page. Once inventory grows past a
 * page, the distance sort should move server-side (pass viewer coords, ORDER
 * BY distance) so pagination respects proximity.
 */
export function sortPlacesByProximity(
  places: Place[],
  hint: GeoHint | null | undefined,
): Place[] {
  if (
    !hint ||
    typeof hint.latitude !== "number" ||
    typeof hint.longitude !== "number"
  ) {
    return places;
  }
  const { latitude: userLat, longitude: userLng } = hint;

  // Stable sort: keep places without coordinates at the end in original order.
  return places
    .map((place, index) => ({
      place,
      index,
      distance: hasCoords(place)
        ? haversineKm(userLat, userLng, place.latitude, place.longitude)
        : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) =>
      a.distance === b.distance ? a.index - b.index : a.distance - b.distance,
    )
    .map((entry) => entry.place);
}
