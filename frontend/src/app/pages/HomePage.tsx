import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../../config/endpoints.config";
import { QUERY_KEYS } from "../../config/queryKeys.config";
import { useApiQuery } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import { PlacesResponse } from "../../types/place.types";
import { GeoHint, sortPlacesByProximity } from "../../utils/geo";
import { useAppSelector } from "../../store/hooks";
import { HomeHeader, MarketplaceHero, PlacesSidebar } from "../components/home";
import { HowItWorksModal } from "../components/home/HowItWorksModal";
import { NewsletterSignupModal } from "../components/home/NewsletterSignupModal";
import { useQueryClient } from "@tanstack/react-query";
import { toApiDateOnly } from "../../utils/dateHelpers";
import { WHOLESALE_UI_ENABLED } from "../../hooks/useWholesale";

// Mapbox alone is ~1.7MB — split it out of the main bundle so it downloads
// after the initial page shell instead of delaying first paint for
// everyone (the map is also hidden on mobile entirely).
const PlacesMap = lazy(() =>
  import("../components/home/PlacesMap").then((m) => ({ default: m.PlacesMap })),
);

const WHOLESALE_PAGE = 24;

export function HomePage() {
  const { searchQuery, maxBid, selectedDate } = useAppSelector(
    (state) => state.search,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const listDate = toApiDateOnly(selectedDate);

  // Silent, coarse IP-based location hint (Vercel edge headers — no prompt).
  // Drives nearest-first ordering. One hint per session is plenty.
  const {
    data: geoHint,
    isFetched: geoFetched,
    isError: geoError,
  } = useApiQuery<GeoHint>({
    queryKey: [QUERY_KEYS.GEO_HINT],
    endpoint: ENDPOINTS.GEO_HINT,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
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
  useEffect(() => {
    setWholesaleLimit(WHOLESALE_PAGE);
  }, [searchDebounced, listDate, maxBidDebounced]);
  const wholesaleParams = {
    ...baseParams,
    source: "wholesale",
    limit: wholesaleLimit,
    ...(near && { near }),
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

  const directPlaces = useMemo(
    () => sortPlacesByProximity(data?.places ?? [], geoHint),
    [data?.places, geoHint],
  );
  const wholesalePlaces = wholesaleData?.places ?? [];
  const wholesaleTotal = wholesaleData?.total ?? 0;
  const places = WHOLESALE_UI_ENABLED ? wholesalePlaces : directPlaces;
  const featuredPlaces = WHOLESALE_UI_ENABLED ? directPlaces : [];

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
        <div className="hidden md:flex w-1/2 flex-1 relative">
          <HowItWorksModal
            triggerClassName="absolute top-4 right-4 z-10 text-sm font-medium text-fg hover:text-fg/80 transition-colors"
          />
          <Suspense fallback={<div className="flex-1 bg-bg" />}>
            <PlacesMap
              places={[...featuredPlaces, ...places]}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
