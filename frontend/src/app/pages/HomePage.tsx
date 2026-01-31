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
import infoImg from "../../assets/info.png";
import { Dialog, DialogContent } from "../components/ui/dialog";

export function HomePage() {
  const { searchQuery, maxBid, selectedDate } = useAppSelector(
    (state) => state.search,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  // Dialog open state for info modal
  const [open, setOpen] = useState(true);
  const onOpenChange = (val: boolean) => setOpen(val);

  const searchDebounced = useDebounce(searchQuery, 300);
  const maxBidDebounced = useDebounce(maxBid, 300);

  const params = {
    searchQuery: searchDebounced,
    ...(maxBidDebounced && { maxPrice: Number(maxBidDebounced) }),
    ...(selectedDate && { date: selectedDate }),
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
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header with Search Bar */}
      <HomeHeader showSearchBar onSearch={handleSearch} />

      {/* How It Works Modal */}
      <HowItWorksModal />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Places List */}
        <div className="w-1/2 bg-bg border-r border-line flex flex-col min-h-0">
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

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          isClose={false}
          className="max-w-[90vw] w-[90vw] !p-0 overflow-hidden !bg-transparent !border-none !shadow-none z-[100]"
        >
          <div className="w-full">
            <img
              src={infoImg}
              alt="How It Works - The Grim Keeper explains the bidding process"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
