import { MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { useApiQuery } from "../../../hooks/useApi";
import {
  ACCOMMODATION_TYPE_LABELS,
  PlacesResponse,
} from "../../../types/place.types";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import {
  PlacesFilters,
  PlacesFiltersState,
  PriceRangeData,
} from "../../components/places/PlacesFilters";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useDebounce } from "../../../hooks/useDebounce";
import { HomeHeader } from "../../components/home";

export function PlacesListPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<PlacesFiltersState>({
    searchQuery: "",
    selectedType: "all",
    priceRange: [0, 0],
    sortBy: "price-asc",
  });

  const searchDebounced = useDebounce(filters.searchQuery, 300);
  const rangeDebounced = useDebounce(JSON.stringify(filters.priceRange), 300);
  const isRange =
    JSON.parse(rangeDebounced)[0] !== 0 || JSON.parse(rangeDebounced)[1] !== 0;

  // Fetch price range for filters
  const { data: priceRangeData } = useApiQuery<PriceRangeData>({
    queryKey: [QUERY_KEYS.PLACES, "price-range"],
    endpoint: ENDPOINTS.PLACES_PRICE_RANGE,
  });

  const params = {
    searchQuery: searchDebounced,
    selectedType: filters.selectedType,
    priceRange: isRange ? rangeDebounced : undefined,
    sortBy: filters.sortBy,
  };
  const { data, isLoading } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "public", params],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params,
  });
  const places = data?.places ?? [];

  // No need to filter on frontend anymore - backend handles it
  const filteredPlaces = places;

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters Section */}
        <PlacesFilters
          filters={filters}
          setFilters={setFilters}
          resultsCount={filteredPlaces.length}
          priceRangeData={priceRangeData}
        />

        {/* Places Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} className="h-80" />
            ))}
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="mx-auto h-16 w-16 text-muted mb-4" />
            <h3 className="text-lg font-medium mb-2 text-fg">
              No places found
            </h3>
            <p className="text-muted">
              Try adjusting your filters to see more results
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map((place) => (
              <Card
                key={place.id}
                className="overflow-hidden glass-2 border-white/10 hover:border-brand/50 transition-all cursor-pointer"
                onClick={() =>
                  navigate(
                    getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { id: place.id }),
                  )
                }
              >
                {/* Cover Image */}
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={
                      (place.images[0] as any)?.url ||
                      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"
                    }
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-brand/20 text-brand border-brand/30">
                      {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-fg">
                    {place.name}
                  </h3>

                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {place.city}, {place.country}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {place.shortDescription}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
