import { useApiQuery } from "./useApi";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";

export interface WholesaleQuote {
  available: boolean;
  nights?: number;
  /** "Book now" = the public price (no game). The member price stays secret. */
  bookNowPricePerNight?: number;
  bookNowTotal?: number;
  /** Taxes/fees the hotel collects at check-in (whole stay). */
  payAtHotel?: number;
  /** Non-tax part of payAtHotel (resort/service fees) — must be in the shown total. */
  payAtHotelNonTax?: number;
  /** bookNowTotal + mandatory non-tax fees: the total to display. */
  bookNowDisplayTotal?: number;
  refundable?: boolean;
  roomName?: string;
  boardName?: string;
}

// Wholesale hotels only show a feature tab / live price when this is on, so
// the frontend can ship before the backend flag is flipped.
export const WHOLESALE_UI_ENABLED =
  import.meta.env.VITE_WHOLESALE_ENABLED === "true";

/** Live members-only price for a wholesale hotel (requires login). */
export const useWholesaleQuote = (
  placeId: string,
  checkInDate?: string,
  checkOutDate?: string,
  enabled = true,
) =>
  useApiQuery<WholesaleQuote>({
    queryKey: ["wholesale", "quote", placeId, checkInDate, checkOutDate],
    endpoint: getEndpoint(ENDPOINTS.WHOLESALE_QUOTE, { id: placeId }),
    params: { checkInDate, checkOutDate },
    enabled: enabled && !!placeId && !!checkInDate && !!checkOutDate,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
