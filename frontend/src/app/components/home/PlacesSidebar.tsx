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
  /** Direct partners pinned above the list as "Secret deal" cards. */
  featuredPlaces?: Place[];
  /** The (wholesale) list below the featured cards is still loading. */
  moreLoading?: boolean;
  /** Show direct partners inside the main list as gold "Secret deal" cards. */
  highlightDirect?: boolean;
}

export function PlacesSidebar({
  places,
  isLoading,
  selectedPlaceId,
  onPlaceHover,
  title,
  featuredPlaces = [],
  moreLoading = false,
  highlightDirect = false,
}: PlacesSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonLoader key={i} className="h-[7.7rem] rounded-xl bg-glass" />
        ))}
      </div>
    );
  }

  if (places.length === 0 && featuredPlaces.length === 0 && !moreLoading) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 text-muted mb-3" />
        <h3 className="font-medium text-fg mb-1">No places found</h3>
        <p className="text-sm text-muted">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title ? (
        <h2 className="sr-only">{title}</h2>
      ) : null}
      {featuredPlaces.length > 0 && (
        <div className="space-y-3 pb-2">
          {featuredPlaces.map((place) => (
            <PlaceListItem
              key={`featured-${place.id}`}
              place={place}
              featured
              isSelected={place.id === selectedPlaceId}
              onHover={onPlaceHover}
            />
          ))}
        </div>
      )}
      {moreLoading &&
        places.length === 0 &&
        [1, 2, 3].map((i) => (
          <SkeletonLoader key={`more-${i}`} className="h-[7.7rem] rounded-xl bg-glass" />
        ))}
      {places.map((place) => (
        <PlaceListItem
          key={place.id}
          place={place}
          featured={highlightDirect && place.supplySource !== "wholesale"}
          isSelected={place.id === selectedPlaceId}
          onHover={onPlaceHover}
        />
      ))}
    </div>
  );
}
