import { Request, Response } from "express";

/**
 * Coarse, silent geolocation hint derived from Vercel's edge IP headers.
 *
 * No permission prompt, no client GPS — Vercel injects these on every request
 * from its edge network. City-level accuracy, which is all we need to reorder
 * the marketplace so the viewer's nearest city shows first. Returns nulls in
 * local dev (headers absent) so the frontend simply falls back to its default
 * order. Nothing here is stored; it's a read of request metadata only.
 *
 * See: https://vercel.com/docs/edge-network/headers#x-vercel-ip-*
 */
export function getGeoHint(req: Request, res: Response) {
  const header = (name: string): string | null => {
    const raw = req.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return null;
    try {
      // City/region can be percent-encoded (e.g. "San%20Diego").
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const latRaw = header("x-vercel-ip-latitude");
  const lngRaw = header("x-vercel-ip-longitude");
  const lat = latRaw !== null ? Number(latRaw) : null;
  const lng = lngRaw !== null ? Number(lngRaw) : null;

  res.status(200).json({
    data: {
      latitude: lat !== null && Number.isFinite(lat) ? lat : null,
      longitude: lng !== null && Number.isFinite(lng) ? lng : null,
      city: header("x-vercel-ip-city"),
      region: header("x-vercel-ip-country-region"),
      country: header("x-vercel-ip-country"),
    },
  });
}
