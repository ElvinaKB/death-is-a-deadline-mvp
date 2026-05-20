import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";
import { Place, ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
import { formatCurrency } from "../../../utils/currency";
import { toApiDateOnly } from "../../../utils/dateHelpers";

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
  const { selectedDate } = useAppSelector((state) => state.search);

  const handleClick = () => {
    const path = getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { id: place.id });
    const apiDate = toApiDateOnly(selectedDate);
    navigate(apiDate ? `${path}?date=${encodeURIComponent(apiDate)}` : path);
  };

  const imageUrl =
    (place.images[0] as { url?: string })?.url ||
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400";

  return (
    <div
      className={`listing-place-card flex flex-col sm:flex-row gap-3 sm:gap-4 p-3.5 min-h-[11rem] sm:min-h-[7.7rem] cursor-pointer transition-all duration-200 ${
        isSelected ? "ring-1 ring-gold/50" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative w-full sm:w-44 h-44 sm:h-[7.7rem] rounded-lg overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={place.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <span className="listing-type-pill inline-block mb-2">
            {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
          </span>

          <h3 className="font-semibold text-fg text-base mb-1 truncate">
            {place.name}
          </h3>

          <div className="flex items-center gap-1 text-[hsl(0_0%_65%)] text-sm mb-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{place.city}</span>
          </div>

          {place.shortDescription && (
            <p className="listing-place-tagline line-clamp-2">
              {place.shortDescription}
            </p>
          )}
        </div>

        <div className="sm:hidden mt-3">
          <button
            type="button"
            className="listing-card-bid-btn h-11 w-full rounded-lg text-sm uppercase"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            BID
          </button>
        </div>
      </div>

      <div className="hidden sm:flex text-right shrink-0 py-1 flex-col justify-end gap-2 min-w-[72px]">
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-[hsl(0_0%_50%)] uppercase shrink-0">
            Retail
          </span>
          <span className="text-[10px] font-semibold tracking-[0.14em] text-fg whitespace-nowrap">
            {formatCurrency(place.retailPrice)}
          </span>
        </div>
        <button
          type="button"
          className="listing-card-bid-btn h-10 px-4 rounded-lg text-xs uppercase"
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
