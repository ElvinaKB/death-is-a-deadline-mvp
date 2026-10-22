import { addDays, format } from "date-fns";
import { prisma } from "../libs/config/prisma";
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
  opts: { liveSearch?: boolean } = {},
): Promise<string | null> {
  const { city, latitude, longitude } = place;
  if (latitude == null || longitude == null) return null;

  // 1) Reuse a match we already have: a wholesale copy of this same hotel
  //    (even paused) within ~150m that carries a liteapiHotelId. This is the
  //    common case — a hotel Nuitee carries was imported as a wholesale copy
  //    and already address-matched — and it works regardless of availability.
  const nearbyCopies = await prisma.place.findMany({
    where: {
      supplySource: "wholesale",
      liteapiHotelId: { not: null },
      latitude: { gte: latitude - LAT_150M, lte: latitude + LAT_150M },
      longitude: { gte: longitude - LNG_150M, lte: longitude + LNG_150M },
    },
    select: { liteapiHotelId: true, latitude: true, longitude: true },
  });
  if (nearbyCopies.length > 0) {
    let best: { id: string; score: number } | null = null;
    for (const c of nearbyCopies) {
      if (!c.liteapiHotelId || c.latitude == null || c.longitude == null) continue;
      const score =
        Math.abs(latitude - c.latitude) + Math.abs(longitude - c.longitude);
      if (!best || score < best.score) best = { id: c.liteapiHotelId, score };
    }
    if (best) return best.id;
  }

  // 2) Fall back to a live LiteAPI search (for hotels not yet imported). This
  //    is slow (two API calls), so it's skipped on the save path and only run
  //    by the nightly sweep.
  if (!opts.liveSearch || !city) return null;
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
/**
 * Nightly sweep: link any direct listing that still has no retail anchor,
 * using the full matcher (DB copy first, then a live LiteAPI search). Lets
 * existing listings — and hotels Nuitee adds later — link themselves without
 * a manual re-save.
 */
export async function syncRetailAnchors(): Promise<{
  checked: number;
  linked: number;
}> {
  const places = await prisma.place.findMany({
    where: {
      supplySource: "direct",
      dynamicRetailEnabled: true,
      retailAnchorHotelId: null,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, city: true, latitude: true, longitude: true },
  });
  let linked = 0;
  for (const p of places) {
    try {
      const hotelId = await matchRetailAnchorHotelId(p, { liveSearch: true });
      if (hotelId) {
        await prisma.place.update({
          where: { id: p.id },
          data: { retailAnchorHotelId: hotelId },
        });
        linked++;
      }
    } catch (err) {
      console.warn(`[retail-anchor] sweep ${p.id} failed:`, (err as Error).message);
    }
  }
  return { checked: places.length, linked };
}

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
