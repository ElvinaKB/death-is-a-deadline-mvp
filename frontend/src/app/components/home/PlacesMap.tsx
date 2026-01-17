import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { getRoute, ROUTES } from "../../../config/routes.config";
import { Place } from "../../../types/place.types";

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX;

// Custom BID marker component
function BidMarker({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? "#ffffff"
          : "linear-gradient(180deg, #283B66, #1E2A44)",
        color: isSelected ? "#1E2A44" : "#F5F3EE",
        border: `1px solid ${isSelected ? "#1E2A44" : "#93A4C9"}`,
        padding: "6px 12px",
        borderRadius: "12px",
        fontWeight: 600,
        fontSize: "12px",
        boxShadow: isSelected
          ? "0 0 20px rgba(140, 160, 255, 0.6)"
          : "0 0 14px rgba(140, 160, 255, 0.45)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transform: isSelected ? "scale(1.1)" : "scale(1)",
        transition: "all 0.2s ease",
      }}
    >
      BID
    </div>
  );
}

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
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<Place | null>(null);

  const handleMarkerClick = useCallback(
    (place: Place) => {
      setPopupInfo(place);
      if (onPlaceSelect) {
        onPlaceSelect(place.id);
      }
    },
    [onPlaceSelect]
  );

  const handlePopupClose = useCallback(() => {
    setPopupInfo(null);
  }, []);

  const handleViewDetails = useCallback(
    (placeId: string) => {
      navigate(getRoute(ROUTES.PUBLIC_PLACE_DETAIL, { id: placeId }));
    },
    [navigate]
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
  const bounds = useMemo(() => {
    if (placesWithCoords.length === 0) {
      return null;
    }

    const lats = placesWithCoords.map((p) => p.latitude!);
    const lngs = placesWithCoords.map((p) => p.longitude!);

    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }, [placesWithCoords]);

  // Default center
  const initialViewState = useMemo(() => {
    if (placesWithCoords.length === 0) {
      return {
        longitude: -74,
        latitude: 40,
        zoom: 3,
      };
    }

    const avgLat =
      placesWithCoords.reduce((sum, p) => sum + p.latitude!, 0) /
      placesWithCoords.length;
    const avgLng =
      placesWithCoords.reduce((sum, p) => sum + p.longitude!, 0) /
      placesWithCoords.length;

    return {
      longitude: avgLng,
      latitude: avgLat,
      zoom: 12,
    };
  }, [placesWithCoords]);

  // Fit bounds when places change
  useEffect(() => {
    if (mapRef.current && bounds && placesWithCoords.length > 1) {
      mapRef.current.fitBounds(
        [
          [bounds.minLng - 0.02, bounds.minLat - 0.02],
          [bounds.maxLng + 0.02, bounds.maxLat + 0.02],
        ],
        { padding: 50, duration: 1000, maxZoom: 14 }
      );
    }
  }, [bounds, placesWithCoords.length]);

  // Show message if no places have coordinates
  if (placesWithCoords.length === 0) {
    return (
      <div className="relative w-full h-full bg-bg flex items-center justify-center">
        <div className="text-center text-muted">
          <p className="text-lg font-medium text-fg">No locations available</p>
          <p className="text-sm">
            Places will appear here once locations are added
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
      >
        <NavigationControl position="top-left" />

        {placesWithCoords.map((place) => {
          const isSelected = place.id === selectedPlaceId;

          return (
            <Marker
              key={place.id}
              longitude={place.longitude!}
              latitude={place.latitude!}
              anchor="bottom"
            >
              <BidMarker
                isSelected={isSelected}
                onClick={() => handleMarkerClick(place)}
              />
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude!}
            latitude={popupInfo.latitude!}
            anchor="bottom"
            offset={40}
            onClose={handlePopupClose}
            closeButton={true}
            closeOnClick={false}
          >
            <div
              className="text-center min-w-[150px] cursor-pointer"
              onClick={() => handleViewDetails(popupInfo.id)}
            >
              <h4 className="font-semibold text-fg mb-1">{popupInfo.name}</h4>
              <p className="text-sm text-muted">
                {popupInfo.city}, {popupInfo.country}
              </p>
              <p className="text-sm font-medium text-success mt-1">
                From ${popupInfo.minimumBid}/night
              </p>
              <p className="text-xs text-brand mt-2 hover:underline">
                View Details →
              </p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
