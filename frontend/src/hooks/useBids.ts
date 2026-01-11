import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "./useApi";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";
import {
  CreateBidRequest,
  BidStatus,
  BidResponse,
  Bid,
  MyBidsResponse,
  BidDetailResponse,
  UpdateBidStatusRequest,
} from "../types/bid.types";

// Check if student has existing bid for a place
export const useBidForPlace = (
  placeId: string,
  options?: { enabled?: boolean }
) => {
  return useApiQuery<BidDetailResponse | null>({
    queryKey: ["bids", "place", placeId],
    endpoint: getEndpoint(ENDPOINTS.BID_FOR_PLACE, { placeId }),
    enabled: !!placeId && options?.enabled !== false,
  });
};

// Get student's own bids
export const useMyBids = (params?: {
  status?: BidStatus;
  page?: number;
  limit?: number;
}) => {
  return useApiQuery<MyBidsResponse>({
    queryKey: ["bids", "my", params],
    endpoint: ENDPOINTS.BIDS_MY,
    params,
  });
};

// Get single bid by ID
export const useBid = (id: string) => {
  return useApiQuery<BidDetailResponse>({
    queryKey: ["bids", id],
    endpoint: getEndpoint(ENDPOINTS.BID_DETAIL, { id }),
    enabled: !!id,
  });
};

// Get all bids (admin)
export const useBids = (params?: {
  status?: BidStatus;
  placeId?: string;
  page?: number;
  limit?: number;
}) => {
  return useApiQuery<MyBidsResponse>({
    queryKey: ["bids", "admin", params],
    endpoint: ENDPOINTS.BIDS_LIST,
    params,
  });
};

// Create a new bid
export const useCreateBid = () => {
  //   const queryClient = useQueryClient();

  return useApiMutation<BidResponse, CreateBidRequest>({
    endpoint: ENDPOINTS.BIDS_CREATE,
    method: "POST",
    showErrorToast: false,
    // onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["bids"] });
    // },
  });
};

// Update bid status (admin)
export const useUpdateBidStatus = () => {
  const queryClient = useQueryClient();

  return useApiMutation<BidResponse, UpdateBidStatusRequest>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.BID_STATUS, { id: vars.id }),
    method: "PATCH",
    transformVariables: ({ status, rejectionReason }) => ({
      status,
      rejectionReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};
