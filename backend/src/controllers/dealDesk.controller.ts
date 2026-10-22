import { Request, Response } from "express";
import { CustomError } from "../libs/utils/CustomError";
import {
  DEAL_OUTCOMES,
  DealOutcome,
  dealAlternatives,
  dealQueue,
  dealStats,
  hotelDealHistory,
  logDealCall,
  saveHotelContact,
  sendNearMissAlerts,
} from "../services/dealDesk.service";

const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export async function queue(req: Request, res: Response) {
  const rows = await dealQueue({
    days: num(req.query.days, 3, 1, 30),
    maxGapPct: num(req.query.maxGap, 10, 0, 100),
    includeCalled: req.query.includeCalled === "true",
  });
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: { opportunities: rows } });
}

export async function stats(req: Request, res: Response) {
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: await dealStats(num(req.query.days, 30, 1, 365)) });
}

export async function hotel(req: Request, res: Response) {
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: await hotelDealHistory(req.params.placeId!) });
}

export async function saveContact(req: Request, res: Response) {
  const { name, role, phone, email, notes } = req.body ?? {};
  const contact = await saveHotelContact(req.params.placeId!, { name, role, phone, email, notes });
  res.status(200).json({ data: contact });
}

export async function logCall(req: Request, res: Response) {
  const b = req.body ?? {};
  if (!b.placeId || typeof b.placeId !== "string") throw new CustomError("placeId is required", 400);
  if (!DEAL_OUTCOMES.includes(b.outcome)) throw new CustomError("Invalid outcome", 400);
  const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const call = await logDealCall({
    placeId: b.placeId,
    bidId: b.bidId ?? null,
    memberId: b.memberId ?? null,
    checkInDate: b.checkInDate ?? null,
    checkOutDate: b.checkOutDate ?? null,
    memberBidPerNight: n(b.memberBidPerNight),
    outcome: b.outcome as DealOutcome,
    amountPerNight: n(b.amountPerNight),
    reason: b.reason ?? null,
    notes: b.notes ?? null,
    directLead: !!b.directLead,
    callbackAt: b.callbackAt ?? null,
  });
  res.status(201).json({ data: call });
}

export async function alternatives(req: Request, res: Response) {
  const max = Number(req.query.maxPerNight);
  if (!Number.isFinite(max) || max <= 0) throw new CustomError("maxPerNight is required", 400);
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({
    data: { hotels: await dealAlternatives(req.params.placeId!, max) },
  });
}

/** Cron (GitHub Actions, every ~10 min): near-miss email to the team. */
export async function nearMissCron(_req: Request, res: Response) {
  const result = await sendNearMissAlerts();
  res.status(200).json({ data: result });
}
