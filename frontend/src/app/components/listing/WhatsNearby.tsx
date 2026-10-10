import "mapbox-gl/dist/mapbox-gl.css";
import { useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  MapRef,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/mapbox";
import {
  Coffee,
  MapPin,
  ShoppingBag,
  ShoppingBasket,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";

type Category = "restaurant" | "cafe" | "bar" | "grocery" | "clothing_store";

interface NearbyItem {
  id: string;
  name: string;
  category: Category;
  latitude: number;
  longitude: number;
  distanceM: number;
  walkMin: number;
  address: string | null;
}

const CATEGORY: Record<Category, { label: string; Icon: LucideIcon; color: string }> = {
  restaurant: { label: "Eat", Icon: Utensils, color: "#F59E0B" },
  cafe: { label: "Coffee", Icon: Coffee, color: "#C08457" },
  bar: { label: "Drinks", Icon: Wine, color: "#E879F9" },
  grocery: { label: "Groceries", Icon: ShoppingBasket, color: "#34D399" },
  clothing_store: { label: "Shops", Icon: ShoppingBag, color: "#60A5FA" },
};

// ~10-minute walk at ~80 m/min.
const WALK_RING_M = 800;

function circlePolygon(lat: number, lng: number, radiusM: number) {
  const points = 64;
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

interface WhatsNearbyProps {
  placeId: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  mapboxToken: string;
}

/**
 * Dark street map of the blocks around a listing with nearby restaurants,
 * cafés, bars, groceries and shops labelled, a 10-minute walking ring, and a
 * "What's walkable" list with walking times. Data comes from our cached
 * /nearby endpoint (Mapbox category search, refreshed monthly per hotel).
 */
export function WhatsNearby({
  placeId,
  latitude,
  longitude,
  address,
  mapboxToken,
}: WhatsNearbyProps) {
  const mapRef = useRef<MapRef>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data } = useApiQuery<{ items: NearbyItem[] }>({
    queryKey: ["places", "nearby", placeId],
    endpoint: getEndpoint(ENDPOINTS.PLACE_NEARBY, { id: placeId }),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const items = data?.items ?? [];
  const categories = useMemo(
    () => (Object.keys(CATEGORY) as Category[]).filter((c) => items.some((i) => i.category === c)),
    [items],
  );
  const shown = useMemo(
    () =>
      (filter === "all" ? items : items.filter((i) => i.category === filter))
        .slice()
        .sort((a, b) => a.distanceM - b.distanceM),
    [items, filter],
  );
  const ring = useMemo(
    () => circlePolygon(latitude, longitude, WALK_RING_M),
    [latitude, longitude],
  );

  const focus = (item: NearbyItem) => {
    setActiveId(item.id);
    mapRef.current?.flyTo({
      center: [item.longitude, item.latitude],
      zoom: 16.5,
      duration: 700,
    });
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-fg mb-1">What&apos;s walkable</h3>
      <p className="text-base text-muted mb-4">
        Food, coffee, drinks and shops within a short walk. The gold ring is
        about a 10-minute walk.
      </p>

      <div className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden border border-line">
        <Map
          ref={mapRef}
          initialViewState={{ latitude, longitude, zoom: 15.3 }}
          style={{ width: "100%", height: "100%" }}
          // Mapbox Standard in night mode keeps the dark look while labelling
          // restaurants, cafés, shops and transit around the hotel.
          mapStyle="mapbox://styles/mapbox/standard"
          mapboxAccessToken={mapboxToken}
          scrollZoom={false}
          dragRotate={false}
          onLoad={(e) => {
            const map = e.target as any;
            try {
              map.setConfigProperty?.("basemap", "lightPreset", "night");
              map.setConfigProperty?.("basemap", "showPointOfInterestLabels", true);
              map.setConfigProperty?.("basemap", "showTransitLabels", true);
            } catch {
              /* older style — falls back to default look */
            }
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <Source id="walk-ring" type="geojson" data={ring}>
            <Layer
              id="walk-ring-fill"
              type="fill"
              paint={{ "fill-color": "#C9A24B", "fill-opacity": 0.08 }}
            />
            <Layer
              id="walk-ring-line"
              type="line"
              paint={{
                "line-color": "#C9A24B",
                "line-width": 1.5,
                "line-dasharray": [2, 2],
                "line-opacity": 0.8,
              }}
            />
          </Source>

          {shown.map((item) => {
            const { Icon, color } = CATEGORY[item.category];
            const active = item.id === activeId;
            return (
              <Marker
                key={item.id}
                latitude={item.latitude}
                longitude={item.longitude}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setActiveId(item.id);
                }}
              >
                <div
                  title={`${item.name} · ${item.walkMin} min walk`}
                  className="flex items-center gap-1 cursor-pointer"
                  style={{ zIndex: active ? 3 : 1 }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black shadow-lg"
                    style={{
                      background: color,
                      transform: active ? "scale(1.25)" : undefined,
                    }}
                  >
                    <Icon className="h-4 w-4 text-black" />
                  </span>
                  {active && (
                    <span className="rounded-md bg-black/85 px-2 py-0.5 text-sm font-semibold text-white whitespace-nowrap">
                      {item.name} · {item.walkMin} min
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* The hotel */}
          <Marker latitude={latitude} longitude={longitude} anchor="center">
            <div
              className="h-5 w-5 rounded-full border-2 border-black"
              style={{ background: "#C9A24B", boxShadow: "0 0 14px rgba(201,162,75,0.95)" }}
              title="This hotel"
            />
          </Marker>
        </Map>
      </div>
      {address && (
        <p className="text-base text-muted mt-3 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 text-gold" />
          {address}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {(["all", ...categories] as const).map((c) => {
              const selected = filter === c;
              const label = c === "all" ? "All" : CATEGORY[c].label;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={`h-10 rounded-full px-4 text-base font-semibold transition-colors ${
                    selected
                      ? "bg-gold text-black"
                      : "border border-line text-fg hover:border-gold/60"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {shown.map((item) => {
              const { Icon, color, label } = CATEGORY[item.category];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => focus(item)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-glass ${
                      item.id === activeId ? "bg-glass" : ""
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${color}26` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-fg">
                        {item.name}
                      </span>
                      <span className="block text-sm text-muted">{label}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-semibold text-gold">
                        {item.walkMin} min walk
                      </span>
                      <span className="block text-sm text-muted">
                        {item.distanceM < 1000
                          ? `${item.distanceM} m`
                          : `${(item.distanceM / 1000).toFixed(1)} km`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
