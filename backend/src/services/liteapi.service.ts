import axios, { AxiosError } from "axios";

// Thin client for Nuitee's LiteAPI (wholesale hotel supply).
// Docs: https://docs.liteapi.travel
// Uses the production key when set, otherwise the sandbox key (sandbox
// bookings are free and never reach a real hotel).

const DATA_BASE = "https://api.liteapi.travel/v3.0";
const BOOK_BASE = "https://book.liteapi.travel/v3.0";

// Standard double room: two adults, one room. Bids carry no guest count, so
// every wholesale quote is priced on this occupancy.
export const DEFAULT_ADULTS = 2;

export function getLiteapiKey(): string | null {
  return process.env.LITEAPI_API_KEY || process.env.LITEAPI_SANDBOX_KEY || null;
}

export function isLiteapiSandbox(): boolean {
  return (getLiteapiKey() || "").startsWith("sand_");
}

function headers() {
  const key = getLiteapiKey();
  if (!key) throw new Error("LITEAPI_API_KEY / LITEAPI_SANDBOX_KEY is not set");
  return { "X-API-Key": key, "Content-Type": "application/json" };
}

function describeError(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as any;
    return body?.error?.description || body?.error?.message || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export class LiteapiError extends Error {
  constructor(
    message: string,
    public readonly noAvailability = false,
  ) {
    super(message);
  }
}

// ---------- Static content ----------

export interface LiteapiHotelSummary {
  id: string;
  name: string;
  hotelDescription?: string;
  city?: string;
  country?: string;
  address?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  main_photo?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
}

export interface LiteapiHotelDetails {
  id: string;
  name: string;
  hotelDescription?: string;
  hotelImportantInformation?: string;
  checkinCheckoutTimes?: { checkin_start?: string; checkout?: string };
  hotelImages?: { url: string; urlHd?: string; defaultImage?: boolean }[];
  main_photo?: string;
  city?: string;
  country?: string;
  address?: string;
  starRating?: number;
  location?: { latitude: number; longitude: number };
  phone?: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
}

export async function getHotelDetails(
  hotelId: string,
): Promise<LiteapiHotelDetails> {
  try {
    const { data } = await axios.get(`${DATA_BASE}/data/hotel`, {
      headers: headers(),
      params: { hotelId },
      timeout: 20_000,
    });
    return data.data;
  } catch (err) {
    throw new LiteapiError(`hotel details ${hotelId}: ${describeError(err)}`);
  }
}

export async function getHotelsByIds(
  hotelIds: string[],
): Promise<LiteapiHotelSummary[]> {
  if (hotelIds.length === 0) return [];
  try {
    const { data } = await axios.get(`${DATA_BASE}/data/hotels`, {
      headers: headers(),
      params: { hotelIds: hotelIds.join(","), limit: hotelIds.length },
      timeout: 30_000,
    });
    return data.data ?? [];
  } catch (err) {
    throw new LiteapiError(`hotel list: ${describeError(err)}`);
  }
}

// ---------- Rates ----------

export interface WholesaleOffer {
  hotelId: string;
  offerId: string;
  roomName: string;
  boardName: string;
  /** What Nuitee charges Deadline for the whole stay (taxes included in it). */
  cost: number;
  /** Nuitee's suggested public selling price for the whole stay. */
  suggestedSellingPrice: number | null;
  /** Mandatory fees/taxes the hotel collects at check-in (whole stay). */
  payAtHotel: number;
  /** Subset of payAtHotel that isn't a government tax (resort/service fees). */
  payAtHotelNonTax: number;
  refundable: boolean;
  currency: string;
}

const TAX_WORDS = /tax|vat|occupancy|tourism|city/i;

// Never auto-book accessible rooms for guests who didn't ask for one (they're
// often the cheapest and there are few of them), or dorm beds for a "room".
const EXCLUDED_ROOM = /disab|accessib|mobility|hearing|wheelchair|roll-?in|dorm|bed in /i;

function toOffer(hotelId: string, roomType: any): WholesaleOffer | null {
  const rate = roomType.rates?.[0];
  if (EXCLUDED_ROOM.test(rate?.name ?? "")) return null;
  const cost = Number(
    roomType.offerRetailRate?.amount ?? rate?.retailRate?.total?.[0]?.amount,
  );
  if (!rate || !Number.isFinite(cost) || cost <= 0) return null;

  // Rates are per-occupancy; one room = the first rate in the offer. Excluded
  // taxes/fees are paid at the property.
  let payAtHotel = 0;
  let payAtHotelNonTax = 0;
  for (const r of roomType.rates ?? []) {
    for (const t of r.retailRate?.taxesAndFees ?? []) {
      if (t.included === false && Number(t.amount) > 0) {
        payAtHotel += Number(t.amount);
        if (!TAX_WORDS.test(t.description || "")) payAtHotelNonTax += Number(t.amount);
      }
    }
  }

  const ssp = Number(
    roomType.suggestedSellingPrice?.amount ??
      rate.retailRate?.suggestedSellingPrice?.[0]?.amount,
  );

  return {
    hotelId,
    offerId: roomType.offerId,
    roomName: rate.name ?? "Room",
    boardName: rate.boardName ?? "",
    cost,
    suggestedSellingPrice: Number.isFinite(ssp) && ssp > 0 ? ssp : null,
    payAtHotel: Math.round(payAtHotel * 100) / 100,
    payAtHotelNonTax: Math.round(payAtHotelNonTax * 100) / 100,
    refundable: rate.cancellationPolicies?.refundableTag === "RFN",
    currency: roomType.offerRetailRate?.currency ?? "USD",
  };
}

interface RatesQuery {
  checkin: string; // yyyy-MM-dd
  checkout: string;
  hotelIds?: string[];
  cityName?: string;
  countryCode?: string;
  adults?: number;
  limit?: number;
}

/** Cheapest offer per hotel for the stay. Hotels with no availability are absent. */
export async function getCheapestOffers(
  q: RatesQuery,
): Promise<Map<string, WholesaleOffer>> {
  const body: Record<string, unknown> = {
    checkin: q.checkin,
    checkout: q.checkout,
    currency: "USD",
    guestNationality: "US",
    occupancies: [{ adults: q.adults ?? DEFAULT_ADULTS }],
    timeout: 20,
  };
  if (q.hotelIds) body.hotelIds = q.hotelIds;
  if (q.cityName) {
    body.cityName = q.cityName;
    body.countryCode = q.countryCode ?? "US";
    body.limit = q.limit ?? 200;
  }

  let data: any;
  try {
    ({ data } = await axios.post(`${DATA_BASE}/hotels/rates`, body, {
      headers: headers(),
      timeout: 45_000,
    }));
  } catch (err) {
    const msg = describeError(err);
    // 2001 = "no availability found" — an empty result, not a failure.
    if (/no availability/i.test(msg)) return new Map();
    throw new LiteapiError(`rates: ${msg}`);
  }

  const result = new Map<string, WholesaleOffer>();
  for (const hotel of data?.data ?? []) {
    for (const roomType of hotel.roomTypes ?? []) {
      const offer = toOffer(hotel.hotelId, roomType);
      if (!offer) continue;
      const best = result.get(hotel.hotelId);
      if (!best || offer.cost < best.cost) result.set(hotel.hotelId, offer);
    }
  }
  return result;
}

// ---------- Booking ----------

export interface PrebookResult {
  prebookId: string;
  price: number;
  currency: string;
}

export async function prebook(offerId: string): Promise<PrebookResult> {
  try {
    const { data } = await axios.post(
      `${BOOK_BASE}/rates/prebook`,
      { offerId, usePaymentSdk: false },
      { headers: headers(), timeout: 45_000 },
    );
    return {
      prebookId: data.data.prebookId,
      price: Number(data.data.price),
      currency: data.data.currency,
    };
  } catch (err) {
    const msg = describeError(err);
    throw new LiteapiError(`prebook: ${msg}`, /availab|sold|expired/i.test(msg));
  }
}

export interface BookGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface BookResult {
  bookingId: string;
  status: string;
  hotelConfirmationCode: string | null;
}

// Passed to the hotel with the reservation (LiteAPI: "not guaranteed"), so the
// front desk / GM can see the booking came from Deadline even though the PMS
// source shows the wholesaler.
export const DEADLINE_BOOKING_REMARK =
  "Booked via Deadline Travel (deadlinetravel.com) - members-only hotel deals. Hotel partnerships: hotels@deadlinetravel.com";

export async function book(
  prebookId: string,
  guest: BookGuest,
  clientReference: string,
): Promise<BookResult> {
  try {
    const { data } = await axios.post(
      `${BOOK_BASE}/rates/book`,
      {
        prebookId,
        // Idempotency key: a retried webhook can't double-book the same bid.
        clientReference,
        holder: guest,
        payment: { method: "ACC_CREDIT_CARD" },
        customTags: { CHANNEL: "DEADLINETRAVEL" },
        guests: [
          {
            occupancyNumber: 1,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            ...(guest.phone && { phone: guest.phone }),
            remarks: DEADLINE_BOOKING_REMARK,
          },
        ],
      },
      { headers: headers(), timeout: 90_000 },
    );
    return {
      bookingId: data.data.bookingId,
      status: data.data.status,
      hotelConfirmationCode: data.data.hotelConfirmationCode ?? null,
    };
  } catch (err) {
    throw new LiteapiError(`book: ${describeError(err)}`);
  }
}

export async function cancelBooking(bookingId: string): Promise<string> {
  try {
    const { data } = await axios.put(
      `${BOOK_BASE}/bookings/${bookingId}`,
      {},
      { headers: headers(), timeout: 45_000 },
    );
    return data?.data?.status ?? "CANCELLED";
  } catch (err) {
    throw new LiteapiError(`cancel: ${describeError(err)}`);
  }
}
