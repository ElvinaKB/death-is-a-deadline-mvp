import { Request, Response } from "express";
import { CustomError } from "../libs/utils/CustomError";
import {
  biddingMembers,
  bidsCsv,
  bidsOverview,
  getPlaceSummary,
  recentlyBidPlaces,
} from "../services/analytics.service";

function daysParam(req: Request, fallback: number): number {
  const n = Number(req.query.days);
  return Number.isFinite(n) && n >= 1 && n <= 730 ? Math.floor(n) : fallback;
}

/** Hotel data page: demand, best-and-final offers, sessions, GM pitch line. */
export async function placeSummary(req: Request, res: Response) {
  const summary = await getPlaceSummary(req.params.id!, daysParam(req, 30));
  if (!summary) throw new CustomError("Place not found", 404);
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: summary });
}

/** CSV of bids (one row per bid, with session best-and-final + outcome). */
export async function exportBidsCsv(req: Request, res: Response) {
  const placeId = typeof req.query.placeId === "string" ? req.query.placeId : undefined;
  const studentId =
    typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const csv = await bidsCsv({ placeId, studentId, days: daysParam(req, 90) });
  const name = placeId ? `hotel-${placeId}` : studentId ? `member-${studentId}` : "all";
  res.set("Cache-Control", "private, no-store");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="deadline-bids-${name}.csv"`);
  res.status(200).send(csv);
}

/** Places page: hotels most recently bid on. */
export async function recentPlaces(req: Request, res: Response) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: { places: await recentlyBidPlaces(limit) } });
}

/** Bids page "By member": one row per member, latest activity first. */
export async function members(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: await biddingMembers({ search, page, limit }) });
}

/** Bids page headline numbers. */
export async function overview(_req: Request, res: Response) {
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: await bidsOverview() });
}
