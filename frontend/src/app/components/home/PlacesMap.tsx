import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place } from "../../../types/place.types";

interface PlacesMapProps {
  places: Place[];
  selectedPlaceId?: string;
  onPlaceSelect?: (placeId: string) => void;
}

// Default center (Los Angeles area based on wireframe)
const DEFAULT_CENTER = { lat: 34.0195, lng: -118.4912 };

export function PlacesMap({
  places,
  selectedPlaceId,
  onPlaceSelect,
}: PlacesMapProps) {
  const navigate = useNavigate();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const handleMarkerClick = useCallback(
    (placeId: string) => {
      if (onPlaceSelect) {
        onPlaceSelect(placeId);
      }
      navigate(getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { id: placeId }));
    },
    [navigate, onPlaceSelect]
  );

  // Filter places with valid coordinates or generate demo positions
  const placesWithPositions = places.map((place, index) => {
    // If place has coordinates, use them; otherwise generate demo positions
    const hasCoords =
      place.latitude !== undefined &&
      place.longitude !== undefined &&
      !isNaN(place.latitude) &&
      !isNaN(place.longitude);

    // Generate grid positions for demo (will be replaced with real map projection)
    const row = Math.floor(index / 4);
    const col = index % 4;
    const top = 15 + row * 20 + Math.random() * 10;
    const left = 15 + col * 20 + Math.random() * 10;

    return {
      ...place,
      position: { top, left },
      hasRealCoords: hasCoords,
    };
  });

  // Calculate bounds for the map iframe
  const placesWithCoords = places.filter(
    (place) =>
      place.latitude !== undefined &&
      place.longitude !== undefined &&
      !isNaN(place.latitude) &&
      !isNaN(place.longitude)
  );

  const bounds =
    placesWithCoords.length > 0
      ? placesWithCoords.reduce(
          (acc, place) => ({
            minLat: Math.min(acc.minLat, place.latitude!),
            maxLat: Math.max(acc.maxLat, place.latitude!),
            minLng: Math.min(acc.minLng, place.longitude!),
            maxLng: Math.max(acc.maxLng, place.longitude!),
          }),
          { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
        )
      : {
          // Default to LA area
          minLat: 33.7,
          maxLat: 34.3,
          minLng: -118.7,
          maxLng: -118.1,
        };

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    bounds.minLng - 0.05
  },${bounds.minLat - 0.05},${bounds.maxLng + 0.05},${
    bounds.maxLat + 0.05
  }&layer=mapnik`;

  return (
    <div className="relative w-full h-full bg-blue-100 overflow-hidden">
      {/* Map Background - OpenStreetMap */}
      <iframe
        title="Places Map"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        src={mapUrl}
        className="absolute inset-0"
      />

      {/* BID Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {placesWithPositions.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const isHovered = place.id === hoveredPlaceId;

          return (
            <button
              key={place.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 
                px-3 py-1.5 rounded-md font-semibold text-sm shadow-lg
                transition-all duration-200 pointer-events-auto cursor-pointer
                border-2
                ${
                  isSelected || isHovered
                    ? "bg-gray-900 text-white border-gray-900 scale-110 z-20"
                    : "bg-white text-gray-900 border-white hover:bg-gray-900 hover:text-white hover:border-gray-900 z-10"
                }`}
              style={{
                top: `${place.position.top}%`,
                left: `${place.position.left}%`,
              }}
              onClick={() => handleMarkerClick(place.id)}
              onMouseEnter={() => setHoveredPlaceId(place.id)}
              onMouseLeave={() => setHoveredPlaceId(null)}
            >
              BID
            </button>
          );
        })}
      </div>

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white/90 px-2 py-1 rounded shadow">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
