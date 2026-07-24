import { lazy, Suspense, useCallback, useState } from "react";
import { ENDPOINTS } from "../../config/endpoints.config";
import { QUERY_KEYS } from "../../config/queryKeys.config";
import { useApiQuery } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import { PlacesResponse } from "../../types/place.types";
import { useAppSelector } from "../../store/hooks";
import { HomeHeader, MarketplaceHero, PlacesSidebar } from "../components/home";
import { HowItWorksModal } from "../components/home/HowItWorksModal";
import { NewsletterSignupModal } from "../components/home/NewsletterSignupModal";
import { useQueryClient } from "@tanstack/react-query";
import { toApiDateOnly } from "../../utils/dateHelpers";

// Mapbox alone is ~1.7MB — split it out of the main bundle so it downloads
// after the initial page shell instead of delaying first paint for
// everyone (the map is also hidden on mobile entirely).
const PlacesMap = lazy(() =>
  import("../components/home/PlacesMap").then((m) => ({ default: m.PlacesMap })),
);

export function HomePage() {
  const { searchQuery, maxBid, selectedDate } = useAppSelector(
    (state) => state.search,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const listDate = toApiDateOnly(selectedDate);

  const params = {
    searchQuery: searchDebounced,
    ...(maxBidDebounced && { maxPrice: Number(maxBidDebounced) }),
    ...(listDate && { date: listDate }),
  };

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "public", params],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params,
  });

  const places = data?.places ?? [];

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
              isLoading={isLoading || isFetching}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceHover={handlePlaceHover}
            />
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="hidden md:flex w-1/2 flex-1 relative">
          <HowItWorksModal
            triggerClassName="absolute top-4 right-4 z-10 text-sm font-medium text-fg hover:text-fg/80 transition-colors"
          />
          <Suspense fallback={<div className="flex-1 bg-bg" />}>
            <PlacesMap
              places={places}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
