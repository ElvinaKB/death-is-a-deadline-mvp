import { addDays, format } from "date-fns";
import {
  getCheapestOffers,
  getHotelsByIds,
  LiteapiHotelSummary,
} from "./liteapi.service";

// Link a DIRECT listing to its LiteAPI (Nuitee) hotel purely by ADDRESS
// (coordinates), then read Nuitee's suggested selling price per night as a
// live, per-date "retail" anchor — far more accurate than a static number.
// Matching is coordinate-only (no name) so a rebrand or spelling never breaks
// the link; ~150m is tight enough that two hotels never collide.

const LAT_150M = 0.00135; // ~150m of latitude in degrees
const LNG_150M = 0.0016; //  ~150m of longitude at mid US latitudes

interface Coords {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Find the LiteAPI hotelId whose coordinates sit within ~150m of this listing.
 * Returns null when there's no address, no city match, or no hotel that close.
 */
export async function matchRetailAnchorHotelId(
  place: Coords,
): Promise<string | null> {
  const { city, latitude, longitude } = place;
  if (!city || latitude == null || longitude == null) return null;

  // Enumerate the city's bookable hotels via a near-term availability search.
  const checkin = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const checkout = format(addDays(new Date(), 4), "yyyy-MM-dd");

  let hotelIds: string[];
  try {
    const offers = await getCheapestOffers({ cityName: city, checkin, checkout });
    hotelIds = [...offers.keys()];
  } catch (err) {
    console.warn("[retail-anchor] city search failed:", (err as Error).message);
    return null;
  }
  if (hotelIds.length === 0) return null;

  let summaries: LiteapiHotelSummary[];
  try {
    summaries = await getHotelsByIds(hotelIds);
  } catch (err) {
    console.warn("[retail-anchor] hotel list failed:", (err as Error).message);
    return null;
  }

  let best: { id: string; score: number } | null = null;
  for (const h of summaries) {
    const lat = Number(h.latitude);
    const lng = Number(h.longitude);
    const id = h.id;
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const dLat = Math.abs(latitude - lat);
    const dLng = Math.abs(longitude - lng);
    if (dLat < LAT_150M && dLng < LNG_150M) {
      const score = dLat + dLng;
      if (!best || score < best.score) best = { id, score };
    }
  }
  return best?.id ?? null;
}

/**
 * Live per-night public price (Nuitee's suggested selling price) for the given
 * LiteAPI hotel and date. Null when the hotel has no availability that night.
 */
export async function getRetailAnchorForDate(
  hotelId: string,
  date: string,
): Promise<number | null> {
  const checkout = format(addDays(new Date(`${date}T12:00:00`), 1), "yyyy-MM-dd");
  try {
    const offers = await getCheapestOffers({
      hotelIds: [hotelId],
      checkin: date,
      checkout,
    });
    const ssp = offers.get(hotelId)?.suggestedSellingPrice;
    return ssp ? Math.round(ssp) : null; // one night → per-night
  } catch (err) {
    console.warn("[retail-anchor] rate lookup failed:", (err as Error).message);
    return null;
  }
}
