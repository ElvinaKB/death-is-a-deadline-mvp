import { useCallback, useState } from "react";
import { ENDPOINTS } from "../../config/endpoints.config";
import { QUERY_KEYS } from "../../config/queryKeys.config";
import { useApiQuery } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import { PlacesResponse } from "../../types/place.types";
import { useAppSelector } from "../../store/hooks";
import { HomeHeader, PlacesMap, PlacesSidebar } from "../components/home";
import { HowItWorksModal } from "../components/home/HowItWorksModal";
import { useQueryClient } from "@tanstack/react-query";

export function HomePage() {
  const { searchQuery, maxBid } = useAppSelector((state) => state.search);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const params = {
    searchQuery: searchDebounced,
    ...(maxBidDebounced && { maxPrice: Number(maxBidDebounced) }),
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header with Search Bar */}
      <HomeHeader showSearchBar onSearch={handleSearch} />

      {/* How It Works Modal */}
      <HowItWorksModal />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Places List */}
        <div className="w-1/2 bg-white border-r flex flex-col min-h-0">
          {/* Places List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <PlacesSidebar
              places={places}
              isLoading={isLoading || isFetching}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceHover={handlePlaceHover}
            />
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="w-1/2 flex-1 relative">
          <PlacesMap
            places={places}
            selectedPlaceId={hoveredPlaceId || selectedPlaceId}
            onPlaceSelect={setSelectedPlaceId}
          />
        </div>
      </div>
    </div>
  );
}
