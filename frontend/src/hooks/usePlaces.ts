import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";
import { QUERY_KEYS } from "../config/queryKeys.config";
import { useApiMutation, useApiQuery } from "./useApi";
import {
  CreatePlacePayload,
  CreatePlaceRequest,
  PlaceResponse,
  PlaceStatus,
  UpdatePlaceRequest,
} from "../types/place.types";
import { apiClient } from "../lib/apiClient";

// Transform frontend request to backend format (File[] -> {url, order}[])
type CreatePlaceInput = CreatePlaceRequest & { imageUrls?: string[] };
type UpdatePlaceStatusInput = { id: string; status: PlaceStatus };
type UpdatePlaceInput = UpdatePlaceRequest & { imageUrls?: string[] };

export const usePlace = (id: string) => {
  return useApiQuery<PlaceResponse>({
    queryKey: QUERY_KEYS.PLACE(id),
    endpoint: ENDPOINTS.PLACE_DETAIL.replace(":id", id),
    enabled: !!id,
  });
};

export const useCreatePlace = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PlaceResponse, CreatePlaceInput>({
    endpoint: ENDPOINTS.PLACE_CREATE,
    method: "POST",
    transformVariables: (data) => {
      const payload: CreatePlacePayload = {
        name: data.name,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        city: data.city,
        country: data.country,
        address: data.address,
        email: data.email,
        latitude: data.latitude,
        longitude: data.longitude,
        accommodationType: data.accommodationType,
        retailPrice: data.retailPrice,
        minimumBid: data.minimumBid,
        autoAcceptAboveMinimum: data.autoAcceptAboveMinimum,
        blackoutDates: data.blackoutDates,
        allowedDaysOfWeek: data.allowedDaysOfWeek,
        status: data.status,
        images: (data.imageUrls || []).map((url, index) => ({
          url,
          order: index,
        })),
      };
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACES });
      toast.success("Place created successfully");
    },
  });
};

export const useUpdatePlace = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PlaceResponse, UpdatePlaceInput>({
    endpoint: (data) => getEndpoint(ENDPOINTS.PLACE_UPDATE, { id: data.id }),
    method: "PUT",
    transformVariables: (data) => {
      const { id, images, ...rest } = data;
      const payload: Partial<CreatePlacePayload> = { ...rest };

      // If new images are provided (already uploaded to Supabase)
      if (data.imageUrls && data.imageUrls.length > 0) {
        payload.images = data.imageUrls.map((url, index) => ({
          url,
          order: index,
        }));
      }
      return payload;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACES });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PLACE(variables.id),
      });
      toast.success("Place updated successfully");
    },
  });
};

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PlaceResponse, UpdatePlaceStatusInput>({
    endpoint: (data) => getEndpoint(ENDPOINTS.PLACE_STATUS, { id: data.id }),
    method: "PATCH",
    transformVariables: (data) => ({ status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACES });
      toast.success("Status updated successfully");
    },
  });
};

export const useDeletePlace = () => {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>({
    endpoint: (id) => getEndpoint(ENDPOINTS.PLACE_DELETE, { id }),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACES });
      toast.success("Place deleted successfully");
    },
  });
};
