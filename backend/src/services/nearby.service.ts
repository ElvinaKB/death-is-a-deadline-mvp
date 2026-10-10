import axios from "axios";
import { Prisma } from "@prisma/client";
import { prisma } from "../libs/config/prisma";

// "What's nearby" for a listing: the closest places to eat, drink and shop
// within walking distance, from Mapbox's Search Box category endpoint.
// Results are cached on the place row and refreshed monthly, so the cost is
// ~5 searches per hotel per month regardless of traffic.

export const NEARBY_CATEGORIES = [
  { id: "restaurant", label: "Eat" },
  { id: "cafe", label: "Coffee" },
  { id: "bar", label: "Drinks" },
  { id: "grocery", label: "Groceries" },
  { id: "clothing_store", label: "Shops" },
] as const;

export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number]["id"];

export interface NearbyItem {
  id: string;
  name: string;
  category: NearbyCategory;
  latitude: number;
  longitude: number;
  distanceM: number;
  walkMin: number;
  address: string | null;
}

const PER_CATEGORY = 3;
const MAX_DISTANCE_M = 1200; // ~15-minute walk
const REFRESH_DAYS = 30;
// Straight-line distance understates street walking; ~80 m/min walking pace.
const walkMinutes = (m: number) => Math.max(1, Math.round((m * 1.25) / 80));

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchCategory(
  token: string,
  category: NearbyCategory,
  lat: number,
  lng: number,
): Promise<NearbyItem[]> {
  const { data } = await axios.get(
    `https://api.mapbox.com/search/searchbox/v1/category/${category}`,
    {
      params: {
        access_token: token,
        proximity: `${lng},${lat}`,
        limit: 8,
        language: "en",
      },
      timeout: 10_000,
    },
  );
  const items: NearbyItem[] = [];
  for (const f of data?.features ?? []) {
    const [fLng, fLat] = f.geometry?.coordinates ?? [];
    if (typeof fLat !== "number" || typeof fLng !== "number") continue;
    const d = Math.round(distanceM(lat, lng, fLat, fLng));
    if (d > MAX_DISTANCE_M) continue;
    items.push({
      id: f.properties?.mapbox_id ?? `${category}-${f.properties?.name}-${d}`,
      name: f.properties?.name ?? "Unnamed",
      category,
      latitude: fLat,
      longitude: fLng,
      distanceM: d,
      walkMin: walkMinutes(d),
      address: f.properties?.address ?? null,
    });
  }
  return items.sort((a, b) => a.distanceM - b.distanceM);
}

export async function fetchNearby(lat: number, lng: number): Promise<NearbyItem[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return [];
  const seen = new Set<string>();
  const out: NearbyItem[] = [];
  const results = await Promise.allSettled(
    NEARBY_CATEGORIES.map((c) => searchCategory(token, c.id, lat, lng)),
  );
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    let taken = 0;
    for (const item of r.value) {
      if (taken >= PER_CATEGORY || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      taken++;
    }
  }
  return out;
}

/** Cached nearby places for a listing (fetches + stores when stale). */
export async function getNearbyForPlace(place: {
  id: string;
  latitude: number | null;
  longitude: number | null;
  nearbyJson: Prisma.JsonValue | null;
  nearbyFetchedAt: Date | null;
}): Promise<NearbyItem[]> {
  if (place.latitude == null || place.longitude == null) return [];
  const fresh =
    place.nearbyFetchedAt &&
    Date.now() - place.nearbyFetchedAt.getTime() < REFRESH_DAYS * 86_400_000;
  if (fresh && Array.isArray(place.nearbyJson)) {
    return place.nearbyJson as unknown as NearbyItem[];
  }
  const items = await fetchNearby(place.latitude, place.longitude);
  if (items.length > 0) {
    await prisma.place
      .update({
        where: { id: place.id },
        data: {
          nearbyJson: items as unknown as Prisma.InputJsonValue,
          nearbyFetchedAt: new Date(),
        },
      })
      // Fail open until migration 053 runs.
      .catch((e) => console.warn("[nearby] cache write failed:", e?.message));
  }
  return items;
}
