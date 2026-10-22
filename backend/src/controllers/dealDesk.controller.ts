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
  saveNegotiationRule,
  sendNearMissAlerts,
  setHotelSmsConsent,
} from "../services/dealDesk.service";
import {
  hotelNegotiationInsight,
  negotiationInsights,
} from "../services/negotiationInsights.service";

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
  let contact = await saveHotelContact(req.params.placeId!, { name, role, phone, email, notes });
  // Deal-text consent is recorded with a timestamp, never just a flag.
  if (typeof req.body?.smsConsent === "boolean") {
    contact = await setHotelSmsConsent(req.params.placeId!, req.body.smsConsent, "admin");
  }
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

/** Learning loop: how hotels have answered bids below their secret price. */
export async function insights(_req: Request, res: Response) {
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({ data: await negotiationInsights() });
}

/** One hotel's record, plus the odds for a bid when ?gap= (and ?bid=) given. */
export async function hotelInsights(req: Request, res: Response) {
  const gap = req.query.gap != null ? num(req.query.gap, 0, 0, 100) : undefined;
  const bid = req.query.bid != null ? Number(req.query.bid) : undefined;
  res.set("Cache-Control", "private, no-store");
  res.status(200).json({
    data: await hotelNegotiationInsight(
      req.params.placeId!,
      gap,
      bid != null && Number.isFinite(bid) ? bid : undefined,
    ),
  });
}

/** Set or clear a hotel's standing auto-accept price (admin-entered). */
export async function saveRule(req: Request, res: Response) {
  const raw = req.body?.autoAcceptFloorPerNight;
  const floor = raw === null || raw === "" || raw === undefined ? null : Number(raw);
  if (floor != null && (!Number.isFinite(floor) || floor <= 0)) {
    throw new CustomError("autoAcceptFloorPerNight must be a positive number or empty", 400);
  }
  const rule = await saveNegotiationRule(req.params.placeId!, {
    autoAcceptFloorPerNight: floor,
    approvedVia: "admin",
    notes: req.body?.notes ?? null,
  });
  res.status(200).json({ data: rule });
}
