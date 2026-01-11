import { useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place } from "../../../types/place.types";

// Fix Leaflet default icon issue
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom BID marker icon
const createBidIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: "custom-bid-marker",
    html: `
      <div style="
        background: ${isSelected ? "#1f2937" : "#ffffff"};
        color: ${isSelected ? "#ffffff" : "#1f2937"};
        border: 2px solid ${isSelected ? "#1f2937" : "#e5e7eb"};
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        white-space: nowrap;
        transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
        transition: all 0.2s ease;
      ">BID</div>
    `,
    iconSize: [50, 30],
    iconAnchor: [25, 30],
  });
};

interface PlacesMapProps {
  places: Place[];
  selectedPlaceId?: string;
  onPlaceSelect?: (placeId: string) => void;
}

// Component to fit bounds when places change
function FitBounds({
  bounds,
}: {
  bounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onPlaceSelect,
}: PlacesMapProps) {
  const navigate = useNavigate();

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
          place.latitude !== null &&
          place.longitude !== null &&
          !isNaN(place.latitude) &&
          !isNaN(place.longitude)
      ),
    [places]
  );

  // Calculate bounds for the map
  const bounds = useMemo<[[number, number], [number, number]]>(() => {
    if (placesWithCoords.length === 0) {
      return [
        [-60, -180],
        [70, 180],
      ];
    }

    if (placesWithCoords.length === 1) {
      const place = placesWithCoords[0];
      return [
        [place.latitude! - 0.05, place.longitude! - 0.05],
        [place.latitude! + 0.05, place.longitude! + 0.05],
      ];
    }

    const lats = placesWithCoords.map((p) => p.latitude!);
    const lngs = placesWithCoords.map((p) => p.longitude!);
    return [
      [Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02],
      [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02],
    ];
  }, [placesWithCoords]);

  // Default center
  const center = useMemo<[number, number]>(() => {
    if (placesWithCoords.length === 0) {
      return [40, -74];
    }
    const avgLat =
      placesWithCoords.reduce((sum, p) => sum + p.latitude!, 0) /
      placesWithCoords.length;
    const avgLng =
      placesWithCoords.reduce((sum, p) => sum + p.longitude!, 0) /
      placesWithCoords.length;
    return [avgLat, avgLng];
  }, [placesWithCoords]);

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
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />

        {placesWithCoords.map((place) => {
          const isSelected = place.id === selectedPlaceId;

          return (
            <Marker
              key={place.id}
              position={[place.latitude!, place.longitude!]}
              icon={createBidIcon(isSelected)}
              eventHandlers={{
                click: () => handleMarkerClick(place.id),
              }}
            >
              <Popup>
                <div className="text-center min-w-[150px]">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {place.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {place.city}, {place.country}
                  </p>
                  <p className="text-sm font-medium text-green-600 mt-1">
                    From ${place.minimumBid}/night
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
