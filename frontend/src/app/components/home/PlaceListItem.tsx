import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place, ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
import { Badge } from "../ui/badge";

interface PlaceListItemProps {
  place: Place;
  isSelected?: boolean;
  onHover?: (placeId: string | null) => void;
}

export function PlaceListItem({
  place,
  isSelected,
  onHover,
}: PlaceListItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { id: place.id }));
  };

  const imageUrl =
    (place.images[0] as any)?.url ||
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400";

  return (
    <div
      className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-brand/10 ring-2 ring-brand"
          : "bg-glass hover:bg-glass-2 border border-line"
      }`}
      onClick={handleClick}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Thumbnail */}
      <div className="relative w-44 h-28 rounded-lg overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={place.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="bg-tag-bg border-transparent text-tag-text text-xs px-2 py-0.5"
            >
              {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-fg text-base mb-1 truncate">
            {place.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted text-sm mb-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>{place.city}</span>
          </div>

          {/* Description */}
          {place.shortDescription && (
            <p className="text-muted text-sm line-clamp-2">
              {place.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Price & Bid Button */}
      <div className="text-right shrink-0 py-1 flex flex-col justify-end">
        <button
          className="btn-bid h-8 px-4 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          BID
        </button>
      </div>
    </div>
  );
}
