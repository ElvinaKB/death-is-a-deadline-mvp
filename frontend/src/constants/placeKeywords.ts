import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Car,
  ChefHat,
  Footprints,
  TrainFront,
  Utensils,
  Waves,
  Wifi,
  Wine,
  WashingMachine,
} from "lucide-react";

/** Stable keys sent as `keywords: string[]` on create/update place — keep in sync with backend. */
export const PLACE_KEYWORD_IDS = [
  "free_wifi",
  "pool",
  "restaurant",
  "bar",
  "walk_to_beach",
  "laundry_machines",
  "free_parking",
  "full_kitchen",
  "workspace",
  "metro_nearby",
] as const;

export type PlaceKeywordId = (typeof PLACE_KEYWORD_IDS)[number];

export interface PlaceKeywordOption {
  id: PlaceKeywordId;
  label: string;
  icon: LucideIcon;
}

export const PLACE_KEYWORD_OPTIONS: PlaceKeywordOption[] = [
  { id: "free_wifi", label: "Free WIFI", icon: Wifi },
  { id: "pool", label: "Pool", icon: Waves },
  { id: "restaurant", label: "Restaurant", icon: Utensils },
  { id: "bar", label: "Bar", icon: Wine },
  { id: "walk_to_beach", label: "Walk to Beach", icon: Footprints },
  { id: "laundry_machines", label: "Laundry Machines", icon: WashingMachine },
  { id: "free_parking", label: "Free Parking", icon: Car },
  { id: "full_kitchen", label: "Full Kitchen", icon: ChefHat },
  { id: "workspace", label: "Workspace", icon: BarChart3 },
  { id: "metro_nearby", label: "Metro Nearby", icon: TrainFront },
];

const KEYWORD_BY_ID = new Map(
  PLACE_KEYWORD_OPTIONS.map((option) => [option.id, option]),
);

export function isPlaceKeywordId(value: string): value is PlaceKeywordId {
  return (PLACE_KEYWORD_IDS as readonly string[]).includes(value);
}

/** Resolve stored keywords to icon + label (unknown keys ignored). */
export function resolvePlaceKeywords(
  keywords?: string[] | null,
): PlaceKeywordOption[] {
  if (!keywords?.length) return [];
  const seen = new Set<PlaceKeywordId>();
  const resolved: PlaceKeywordOption[] = [];
  for (const key of keywords) {
    if (!isPlaceKeywordId(key) || seen.has(key)) continue;
    seen.add(key);
    const option = KEYWORD_BY_ID.get(key);
    if (option) resolved.push(option);
  }
  return resolved;
}
