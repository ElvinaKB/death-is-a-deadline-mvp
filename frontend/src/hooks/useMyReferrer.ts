import { useApiQuery } from "./useApi";
import { ENDPOINTS } from "../config/endpoints.config";
import { useAppSelector } from "../store/hooks";
import { UserRole } from "../types/auth.types";

export interface MyReferrerHotel {
  placeId: string;
  name: string;
  city: string;
  bookings: number;
  gross: number;
  earning: number;
  referralStartedAt: string | null;
  windowEndsAt: string | null;
}

export interface MyReferrer {
  displayName: string;
  email: string;
  splitPercent: number;
  referralWindowMonths: number;
  taxStatus: string;
  taxLegalName?: string | null;
  taxClassification?: string | null;
  taxAddress?: string | null;
  totalEarnings: number;
  bookingCount: number;
  hotels: MyReferrerHotel[];
}

/**
 * Fetches the logged-in user's referrer/affiliate profile (or null if they
 * aren't one). Only runs for authenticated travelers.
 */
export function useMyReferrer() {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const enabled = Boolean(isAuthenticated && user?.role === UserRole.STUDENT);
  return useApiQuery<MyReferrer | null>({
    queryKey: ["my-referrer"],
    endpoint: ENDPOINTS.MY_REFERRER,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
