import { ROUTES, getRoute } from "../config/routes.config";

type PlaceLink = {
  slug: string;
};

export function getPublicPlacePath(place: PlaceLink): string {
  return getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { slug: place.slug });
}

export function getPublicPlaceUrl(
  place: PlaceLink,
  query?: Record<string, string | undefined>,
): string {
  let path = getPublicPlacePath(place);

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const qs = params.toString();
    if (qs) path += `?${qs}`;
  }

  return path;
}
