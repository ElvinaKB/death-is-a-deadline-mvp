import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place } from "../../../types/place.types";

interface PlacesMapProps {
  places: Place[];
  selectedPlaceId?: string;
  onPlaceSelect?: (placeId: string) => void;
}

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

  // Filter only places with valid coordinates
  const placesWithCoords = useMemo(
    () =>
      places.filter(
        (place) =>
          place.latitude !== undefined &&
          place.longitude !== undefined &&
          !isNaN(place.latitude) &&
          !isNaN(place.longitude)
      ),
    [places]
  );

  // Calculate bounds for the map iframe
  const bounds = useMemo(() => {
    if (placesWithCoords.length === 0) {
      // Default to world view if no places with coordinates
      return {
        minLat: -60,
        maxLat: 70,
        minLng: -180,
        maxLng: 180,
      };
    }

    if (placesWithCoords.length === 1) {
      // Single place - center on it with some padding
      const place = placesWithCoords[0];
      return {
        minLat: place.latitude! - 0.05,
        maxLat: place.latitude! + 0.05,
        minLng: place.longitude! - 0.05,
        maxLng: place.longitude! + 0.05,
      };
    }

    return placesWithCoords.reduce(
      (acc, place) => ({
        minLat: Math.min(acc.minLat, place.latitude!),
        maxLat: Math.max(acc.maxLat, place.latitude!),
        minLng: Math.min(acc.minLng, place.longitude!),
        maxLng: Math.max(acc.maxLng, place.longitude!),
      }),
      { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
    );
  }, [placesWithCoords]);

  // Calculate marker positions based on actual coordinates
  const getMarkerPosition = useCallback(
    (lat: number, lng: number) => {
      const padding = 0.1; // 10% padding
      const latRange = bounds.maxLat - bounds.minLat || 1;
      const lngRange = bounds.maxLng - bounds.minLng || 1;

      // Convert lat/lng to percentage position within bounds
      // Note: latitude is inverted (higher lat = lower on screen)
      const top =
        padding * 100 +
        ((bounds.maxLat - lat) / latRange) * (100 - 2 * padding * 100);
      const left =
        padding * 100 +
        ((lng - bounds.minLng) / lngRange) * (100 - 2 * padding * 100);

      return { top, left };
    },
    [bounds]
  );

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    bounds.minLng - 0.05
  },${bounds.minLat - 0.05},${bounds.maxLng + 0.05},${
    bounds.maxLat + 0.05
  }&layer=mapnik`;

  // Show message if no places have coordinates
  if (placesWithCoords.length === 0) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No locations available</p>
          <p className="text-sm">
            Places will appear here once locations are added
          </p>
        </div>
      </div>
    );
  }

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
        {placesWithCoords.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const isHovered = place.id === hoveredPlaceId;
          const position = getMarkerPosition(place.latitude!, place.longitude!);

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
                top: `${position.top}%`,
                left: `${position.left}%`,
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
