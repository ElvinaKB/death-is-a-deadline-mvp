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
