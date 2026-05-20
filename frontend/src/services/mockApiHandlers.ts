import type { Session } from "@supabase/supabase-js";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ENDPOINTS } from "../config/endpoints.config";
import { AuthResponse, LoginRequest, User } from "../types/auth.types";
import { BidStatus, CreateBidRequest } from "../types/bid.types";
import { PaymentStatus } from "../types/payment.types";
import { PlaceStatus } from "../types/place.types";
import { MOCK_USERS, MockDataService } from "./mockData";
import { toApiDateOnly } from "../utils/dateHelpers";

function mockSession(email: string): Session {
  return {
    access_token: "preview-bypass-access-token",
    refresh_token: "preview-bypass-refresh-token",
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: "bearer",
    user: {
      id: "preview-user",
      email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  } as Session;
}

function toUser(record: (typeof MOCK_USERS)[string]): User {
  const { password: _password, ...user } = record;
  return user;
}

function normalizePath(endpoint: string): string {
  const path = endpoint.split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

function getQueryParam(endpoint: string, key: string): string | null {
  const query = endpoint.includes("?") ? endpoint.split("?")[1] : "";
  if (!query) return null;
  return new URLSearchParams(query).get(key);
}

function withInventory(
  place: ReturnType<typeof MockDataService.getPlaceById>,
  date?: string,
) {
  if (!place) return null;
  const dateOnly = toApiDateOnly(date);
  if (!dateOnly) return place;

  const isBlackout = (place.blackoutDates ?? []).some(
    (d) => toApiDateOnly(d) === dateOnly,
  );
  const exhausted = isBlackout || place.id === "place-4";

  return {
    ...place,
    availableInventory: exhausted ? 0 : place.maxInventory,
    isInventoryExhausted: exhausted,
  };
}

function filterPublicPlaces(endpoint: string) {
  const date = getQueryParam(endpoint, "date");
  const dateOnly = toApiDateOnly(date);

  let places = MockDataService.getPlaces().filter(
    (p) => p.status === PlaceStatus.LIVE,
  );

  if (dateOnly) {
    places = places
      .map((p) => withInventory(p, dateOnly))
      .filter((p) => p && !p.isInventoryExhausted) as typeof places;
  }

  return { places };
}

export function resolveMockApi<T>(
  endpoint: string,
  method: string,
  body?: unknown,
): T {
  const path = normalizePath(endpoint);

  if (path === ENDPOINTS.LOGIN && method === "POST") {
    const { email, password } = body as LoginRequest;
    const record = MOCK_USERS[email.toLowerCase()];
    if (!record || record.password !== password) {
      throw {
        message:
          "Invalid email or password (preview: see banner for test accounts)",
        statusCode: 401,
      };
    }
    return {
      user: toUser(record),
      token: mockSession(email),
      message: "Preview bypass login",
    } as T;
  }

  if (path === ENDPOINTS.PLACES_PUBLIC && method === "GET") {
    return filterPublicPlaces(endpoint) as T;
  }

  const publicPlaceMatch = path.match(/^\/api\/places\/public\/([^/]+)$/);
  if (publicPlaceMatch && method === "GET") {
    const raw = MockDataService.getPlaceById(publicPlaceMatch[1]);
    if (!raw || raw.status !== PlaceStatus.LIVE) {
      throw { message: "Place not found", statusCode: 404 };
    }
    const date = getQueryParam(endpoint, "date");
    const place = withInventory(raw, date ?? undefined);
    const response: {
      place: NonNullable<typeof place>;
      inventoryMessage?: string;
    } = { place: place! };
    if (place?.isInventoryExhausted && date) {
      response.inventoryMessage =
        "Inventory sold out for this day, try a different date or place";
    }
    return response as T;
  }

  if (path === ENDPOINTS.BIDS_MY && method === "GET") {
    return { bids: [] } as T;
  }

  if (path === ENDPOINTS.STUDENTS_STATS && method === "GET") {
    return { total: 0, pending: 0, approved: 0, rejected: 0 } as T;
  }

  if (path === ENDPOINTS.STUDENTS_LIST && method === "GET") {
    return { students: [] } as T;
  }

  if (path === ENDPOINTS.PLACES_LIST && method === "GET") {
    return { places: MockDataService.getPlaces() } as T;
  }

  if (path === ENDPOINTS.BIDS_LIST && method === "GET") {
    return { bids: [] } as T;
  }

  if (path === ENDPOINTS.HOTEL_BIDS_LIST && method === "GET") {
    return { bids: [] } as T;
  }

  if (path === ENDPOINTS.HOTEL_PLACES_LIST && method === "GET") {
    return { places: [] } as T;
  }

  if (path === ENDPOINTS.HOTEL_DASHBOARD_STATS && method === "GET") {
    return { totalPlaces: 0, livePlaces: 0, totalBids: 0 } as T;
  }

  const bidForPlaceMatch = path.match(/^\/api\/bids\/place\/([^/]+)$/);
  if (bidForPlaceMatch && method === "GET") {
    return { bid: null } as T;
  }

  if (path === ENDPOINTS.TESTIMONIALS_LIST && method === "GET") {
    return [] as T;
  }

  if (path === ENDPOINTS.REVIEW_PLATFORMS_LIST && method === "GET") {
    return [] as T;
  }

  if (path === ENDPOINTS.CONTACT && method === "POST") {
    return {
      success: true,
      message: "Preview bypass: contact message recorded (not emailed).",
    } as T;
  }

  if (path === ENDPOINTS.BIDS_CREATE && method === "POST") {
    const req = body as CreateBidRequest;
    const place = MockDataService.getPlaceById(req.placeId);
    if (!place) {
      throw { message: "Place not found", statusCode: 404 };
    }
    const checkIn = parseISO(req.checkInDate);
    const checkOut = parseISO(req.checkOutDate);
    const totalNights = Math.max(
      1,
      differenceInCalendarDays(checkOut, checkIn),
    );
    const totalAmount = totalNights * req.bidPerNight;
    const accepted = req.bidPerNight >= place.minimumBid;
    const bidId = `preview-bid-${Date.now()}`;
    return {
      bid: {
        id: bidId,
        placeId: req.placeId,
        studentId: "preview-student",
        checkInDate: req.checkInDate,
        checkOutDate: req.checkOutDate,
        bidPerNight: req.bidPerNight,
        totalNights,
        totalAmount,
        platformCommission: null,
        payableToHotel: null,
        payoutMethod: null,
        isPaidToHotel: false,
        paidToHotelAt: null,
        payoutNotes: null,
        status: accepted ? BidStatus.ACCEPTED : BidStatus.REJECTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      status: accepted ? BidStatus.ACCEPTED : BidStatus.REJECTED,
      message: accepted
        ? "Your bid met the hotel threshold."
        : "Bid below the hotel's hidden threshold. Try a higher amount.",
    } as T;
  }

  if (path === ENDPOINTS.PAYMENT_CREATE_INTENT && method === "POST") {
    const { bidId } = body as { bidId: string };
    const paymentId = `preview-payment-${bidId}`;
    return {
      message: "Preview bypass payment intent",
      payment: {
        id: paymentId,
        bidId,
        studentId: "preview-student",
        amount: 0,
        currency: "usd",
        status: PaymentStatus.AUTHORIZED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      clientSecret: "preview_bypass_secret",
    } as T;
  }

  const paymentConfirmMatch = path.match(/^\/api\/payments\/([^/]+)\/confirm$/);
  if (paymentConfirmMatch && method === "POST") {
    return {
      message: "Preview bypass payment confirmed",
      payment: {
        id: paymentConfirmMatch[1],
        bidId: "preview-bid",
        studentId: "preview-student",
        amount: 0,
        currency: "usd",
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as T;
  }

  if (method === "GET") {
    console.warn(`[Preview bypass] No mock for ${method} ${path} — returning null`);
    return null as T;
  }

  console.warn(`[Preview bypass] No mock for ${method} ${path}`);
  return {} as T;
}

export function getPreviewBypassStudentUser(): User {
  return toUser(MOCK_USERS["student@university.edu"]);
}

export function getPreviewBypassAuthResponse(): AuthResponse {
  const user = getPreviewBypassStudentUser();
  return {
    user,
    token: mockSession(user.email),
    message: "Preview bypass auto-login",
  };
}
