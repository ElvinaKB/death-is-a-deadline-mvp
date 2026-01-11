import { useNavigate } from "react-router-dom";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place, ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
import { Button } from "../ui/button";

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
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : "bg-white hover:bg-gray-50 border border-transparent"
      }`}
      onClick={handleClick}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={place.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {ACCOMMODATION_TYPE_LABELS[place.accommodationType]?.charAt(0)}
              </span>
              <h3 className="font-semibold text-sm truncate">{place.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Bid student rates on unsold rooms
            </p>
          </div>

          {/* BID Button */}
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-8 px-4"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            BID
          </Button>
        </div>
      </div>
    </div>
  );
}
