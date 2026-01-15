import { MapPin } from "lucide-react";
import { Place } from "../../../types/place.types";
import { PlaceListItem } from "./PlaceListItem";
import { SkeletonLoader } from "../common/SkeletonLoader";

interface PlacesSidebarProps {
  places: Place[];
  isLoading: boolean;
  selectedPlaceId?: string;
  onPlaceHover?: (placeId: string | null) => void;
  title?: string;
}

export function PlacesSidebar({
  places,
  isLoading,
  selectedPlaceId,
  onPlaceHover,
  title = "Local getaways",
}: PlacesSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg px-1">{title}</h2>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonLoader key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="font-medium text-gray-600 mb-1">No places found</h3>
        <p className="text-sm text-gray-500">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg px-1">{title}</h2>
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto px-1 py-2">
        {places.map((place) => (
          <PlaceListItem
            key={place.id}
            place={place}
            isSelected={place.id === selectedPlaceId}
            onHover={onPlaceHover}
          />
        ))}
      </div>
    </div>
  );
}
