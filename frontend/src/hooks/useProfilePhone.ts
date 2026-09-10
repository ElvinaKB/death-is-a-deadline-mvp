import { useApiQuery } from "./useApi";
import { ENDPOINTS } from "../config/endpoints.config";
import { useAppSelector } from "../store/hooks";
import { UserRole } from "../types/auth.types";

interface ProfilePhoneResponse {
  profile: { phone?: string };
}

/**
 * Returns the logged-in traveler's contact phone on file (or "" if none / not
 * a traveler). Used by the bid form to skip asking for a phone when we already
 * have one. Only runs for authenticated travelers.
 */
export function useProfilePhone(): { phone: string; isLoading: boolean } {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const enabled = Boolean(isAuthenticated && user?.role === UserRole.STUDENT);
  const query = useApiQuery<ProfilePhoneResponse>({
    queryKey: ["profile-phone"],
    endpoint: ENDPOINTS.PROFILE,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
  return {
    phone: query.data?.profile?.phone ?? "",
    isLoading: enabled && query.isLoading,
  };
}
