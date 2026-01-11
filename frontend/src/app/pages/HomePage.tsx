import { useState, useCallback } from "react";
import { ENDPOINTS } from "../../config/endpoints.config";
import { QUERY_KEYS } from "../../config/queryKeys.config";
import { useApiQuery } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import { PlacesResponse } from "../../types/place.types";
import {
  HomeHeader,
  SearchBar,
  PlacesMap,
  PlacesSidebar,
} from "../components/home";
import { useQueryClient } from "@tanstack/react-query";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxBid, setMaxBid] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const params = {
    searchQuery: searchDebounced,
    ...(maxBidDebounced && { maxPrice: Number(maxBidDebounced) }),
  };

  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "public", params],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params,
  });

  const places = data?.places ?? [];

  const handleSearch = useCallback(() => {
    // Search is already debounced and reactive
    // This is for explicit search button click if needed
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.PLACES, "public", params],
    });
  }, [queryClient, params]);

  const handlePlaceHover = useCallback((placeId: string | null) => {
    setHoveredPlaceId(placeId);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <HomeHeader />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Search + Places List */}
        <div className="w-[420px] bg-white border-r overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              maxBid={maxBid}
              onMaxBidChange={setMaxBid}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSearch={handleSearch}
            />
          </div>

          {/* Places List */}
          <div className="flex-1 overflow-hidden p-4">
            <PlacesSidebar
              places={places}
              isLoading={isLoading}
              selectedPlaceId={hoveredPlaceId || selectedPlaceId}
              onPlaceHover={handlePlaceHover}
            />
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="flex-1 relative">
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
