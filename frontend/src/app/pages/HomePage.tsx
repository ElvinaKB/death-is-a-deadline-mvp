import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../../config/endpoints.config";
import { QUERY_KEYS } from "../../config/queryKeys.config";
import { useApiQuery } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import { Place, PlacesResponse } from "../../types/place.types";
import { GeoHint, haversineKm, sortPlacesByProximity } from "../../utils/geo";
import { useAppSelector } from "../../store/hooks";
import { HomeHeader, MarketplaceHero, PlacesSidebar } from "../components/home";
import { HowItWorksModal } from "../components/home/HowItWorksModal";
import { NewsletterSignupModal } from "../components/home/NewsletterSignupModal";
import { useQueryClient } from "@tanstack/react-query";
import { toApiDateOnly } from "../../utils/dateHelpers";
import { clearReturnTo } from "../../utils/returnTo";
import { WHOLESALE_UI_ENABLED } from "../../hooks/useWholesale";

// Mapbox alone is ~1.7MB — split it out of the main bundle so it downloads
// after the initial page shell instead of delaying first paint for
// everyone (the map is also hidden on mobile entirely).
const PlacesMap = lazy(() =>
  import("../components/home/PlacesMap").then((m) => ({ default: m.PlacesMap })),
);

const WHOLESALE_PAGE = 24;
// Partner hotels within this distance of the viewer are pinned on top.
const NEARBY_KM = 80;

export function HomePage() {
  const { searchQuery, location, maxBid, selectedDate } = useAppSelector(
    (state) => state.search,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  // Back on the marketplace: signing in from here should stay here.
  useEffect(() => {
    clearReturnTo();
  }, []);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const listDate = toApiDateOnly(selectedDate);

  // Silent, coarse IP-based location hint (Vercel edge headers — no prompt).
  // Drives nearest-first ordering. One hint per session is plenty.
  const {
    data: ipGeoHint,
    isFetched: geoFetched,
    isError: geoError,
  } = useApiQuery<GeoHint>({
    queryKey: [QUERY_KEYS.GEO_HINT],
    endpoint: ENDPOINTS.GEO_HINT,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  // A city picked in the search bar replaces the viewer's own location:
  // hotels nearest that city first, partner deals there pinned on top.
  const geoHint = useMemo<GeoHint | undefined>(
    () =>
      location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.label,
            region: null,
            country: null,
          }
        : ipGeoHint,
    [location, ipGeoHint],
  );
  // Rounded so nearby viewers share the edge-cached response.
  const near =
    typeof geoHint?.latitude === "number" && typeof geoHint?.longitude === "number"
      ? `${geoHint.latitude.toFixed(1)},${geoHint.longitude.toFixed(1)}`
      : undefined;

  const baseParams = {
    searchQuery: searchDebounced,
    ...(maxBidDebounced && { maxPrice: Number(maxBidDebounced) }),
    ...(listDate && { date: listDate }),
  };

  // 1) Direct partner hotels — the real secret prices. Few rows, loads first
  //    and renders at the top as gold "Secret deal" cards.
  const params = { ...baseParams, limit: 50 };
  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "public", params],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params,
  });

  // 2) Wholesale hotels below, nearest-first across all of California, a
  //    page at a time ("Show more hotels"). Waits for the location hint so
  //    the first page is already the closest hotels.
  const [wholesaleLimit, setWholesaleLimit] = useState(WHOLESALE_PAGE);
  // "Search this area": the map viewport the user panned to (pending) and the
  // one they applied (active). A new text/city search clears both.
  const [pendingBbox, setPendingBbox] = useState<string | null>(null);
  const [activeBbox, setActiveBbox] = useState<string | null>(null);
  useEffect(() => {
    setWholesaleLimit(WHOLESALE_PAGE);
    setPendingBbox(null);
    setActiveBbox(null);
  }, [searchDebounced, listDate, maxBidDebounced, location]);
  // When an area is applied, filter to that box; otherwise order nearest-first.
  const geoScope = activeBbox
    ? { bbox: activeBbox }
    : near
      ? { near }
      : {};
  const wholesaleParams = {
    ...baseParams,
    source: "wholesale",
    limit: wholesaleLimit,
    ...geoScope,
  };
  const {
    data: wholesaleData,
    isLoading: wholesaleLoading,
    isFetching: wholesaleFetching,
  } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "public", "wholesale", wholesaleParams],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params: wholesaleParams,
    enabled: WHOLESALE_UI_ENABLED && (geoFetched || geoError),
  });

  // Map pins: a denser, nearest-first set just for the map — so the whole
  // metro shows (e.g. all five boroughs + Jersey when you search New York),
  // decoupled from the paginated list below. Clustering keeps it light.
  const MAP_PIN_LIMIT = 250;
  const { data: mapData } = useApiQuery<PlacesResponse>({
    queryKey: [
      QUERY_KEYS.PLACES,
      "public",
      "wholesale-map",
      { ...baseParams, ...geoScope, limit: MAP_PIN_LIMIT },
    ],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params: {
      ...baseParams,
      source: "wholesale",
      limit: MAP_PIN_LIMIT,
      ...geoScope,
    },
    enabled: WHOLESALE_UI_ENABLED && (geoFetched || geoError),
  });

  const directPlaces = useMemo(
    () => sortPlacesByProximity(data?.places ?? [], geoHint),
    [data?.places, geoHint],
  );
  const wholesalePlaces = wholesaleData?.places ?? [];
  const wholesaleTotal = wholesaleData?.total ?? 0;
  const mapPins = mapData?.places ?? [];

  // Partner hotels near the viewer (or matching their search) are pinned on
  // top; partners in other cities slot into the wholesale list at their real
  // distance, so an SF visitor sees SF deals first and LA deals among LA hotels.
  const { featuredPlaces, places } = useMemo(() => {
    if (!WHOLESALE_UI_ENABLED) {
      return { featuredPlaces: [] as Place[], places: directPlaces };
    }
    const lat = geoHint?.latitude;
    const lng = geoHint?.longitude;
    const searching = !!searchDebounced?.trim();
    if (searching || typeof lat !== "number" || typeof lng !== "number") {
      return { featuredPlaces: directPlaces, places: wholesalePlaces };
    }
    const dist = (p: Place) =>
      typeof p.latitude === "number" && typeof p.longitude === "number"
        ? haversineKm(lat, lng, p.latitude, p.longitude)
        : Number.POSITIVE_INFINITY;
    const nearby = directPlaces.filter((p) => dist(p) <= NEARBY_KM);
    const far = directPlaces.filter((p) => dist(p) > NEARBY_KM);
    // Only merge far partners up to the farthest wholesale hotel loaded so
    // far; the rest appear as "Show more hotels" reaches their distance.
    const allLoaded = wholesalePlaces.length >= wholesaleTotal;
    const reach = wholesalePlaces.length
      ? dist(wholesalePlaces[wholesalePlaces.length - 1]!)
      : 0;
    const merged = [
      ...wholesalePlaces,
      ...far.filter((p) => allLoaded || dist(p) <= reach),
    ].sort((a, b) => dist(a) - dist(b));
    return { featuredPlaces: nearby, places: merged };
  }, [directPlaces, wholesalePlaces, wholesaleTotal, geoHint, searchDebounced]);
  // The map plots a denser, nearest-first set (so the whole metro shows when
  // you zoom out); fall back to the list while that loads.
  const mapPlaces = useMemo(
    () => [...featuredPlaces, ...(mapPins.length ? mapPins : places)],
    [featuredPlaces, mapPins, places],
  );
  // Frame on the nearest ~24 so the opening view spans the local area (not one
  // tight cluster), while the rest of the metro is a zoom-out away.
  const mapFocus = useMemo(
    () => [...featuredPlaces, ...(mapPins.length ? mapPins : places).slice(0, 24)],
    [featuredPlaces, mapPins, places],
  );

  const handleSearch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.PLACES, "public", params],
    });
  }, [queryClient, params]);

  const handlePlaceHover = useCallback((placeId: string | null) => {
    setHoveredPlaceId(placeId);
  }, []);

  return (
    <div className="flex-1 min-h-0 bg-bg flex flex-col overflow-hidden min-w-0">
      {/* Header with Search Bar */}
      <HomeHeader showSearchBar onSearch={handleSearch} />
      <NewsletterSignupModal />

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex min-h-0 min-w-0" tabIndex={-1}>
        {/* Left Sidebar - Places List */}
        <div className="w-full md:w-1/2 bg-bg flex flex-col min-h-0 min-w-0">
          {/* Places List */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
            <MarketplaceHero />
            <PlacesSidebar
              places={places}
              isLoading={isLoading}
              moreLoading={WHOLESALE_UI_ENABLED && (wholesaleLoading || !wholesaleData)}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceHover={handlePlaceHover}
              featuredPlaces={featuredPlaces}
              highlightDirect={WHOLESALE_UI_ENABLED}
            />
            {WHOLESALE_UI_ENABLED && wholesalePlaces.length < wholesaleTotal && (
              <button
                type="button"
                onClick={() => setWholesaleLimit((n) => n + WHOLESALE_PAGE)}
                disabled={wholesaleFetching}
                className="mt-4 h-12 w-full rounded-xl border border-gold/50 text-base font-semibold text-gold hover:bg-gold/10 disabled:opacity-60"
              >
                {wholesaleFetching
                  ? "Loading…"
                  : `Show more hotels (${wholesaleTotal - wholesalePlaces.length} more)`}
              </button>
            )}
          </div>
        </div>

        {/* Right Side - Map */}
        {/* The map stays on screen while the list scrolls (sticky under the
            75px header). Without a fixed height it stretched to the whole
            list (5,000px+) and centred the pins far below the fold. */}
        <div className="hidden md:flex w-1/2 flex-1 relative md:sticky md:top-[75px] md:self-start md:h-[calc(100dvh-75px)]">
          <HowItWorksModal
            triggerClassName="absolute top-4 right-4 z-10 text-sm font-medium text-fg hover:text-fg/80 transition-colors"
          />
          {/* Search-this-area: appears after the user pans/zooms to a new box */}
          {WHOLESALE_UI_ENABLED &&
            pendingBbox &&
            pendingBbox !== activeBbox && (
              <button
                type="button"
                onClick={() => {
                  setActiveBbox(pendingBbox);
                  setPendingBbox(null);
                }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-10 h-10 px-5 rounded-full bg-bg/90 border border-gold/60 text-sm font-semibold text-gold shadow-lg backdrop-blur hover:bg-gold/10"
              >
                Search this area
              </button>
            )}
          <Suspense fallback={<div className="flex-1 bg-bg" />}>
            <PlacesMap
              places={mapPlaces}
              focusPlaces={mapFocus}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
              onUserMove={(b) => setPendingBbox(b.join(","))}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
