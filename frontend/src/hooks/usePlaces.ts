import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Place,
  CreatePlaceRequest,
  UpdatePlaceRequest,
  PlaceStatus,
} from "../types/place.types";
import { MockDataService } from "../services/mockData";
import { toast } from "sonner";

// Mock API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const usePlaces = () => {
  return useQuery({
    queryKey: ["places"],
    queryFn: async () => {
      await delay(300);
      return MockDataService.getPlaces();
    },
  });
};

export const usePlace = (id: string) => {
  return useQuery({
    queryKey: ["place", id],
    queryFn: async () => {
      await delay(300);
      const place = MockDataService.getPlaceById(id);
      if (!place) throw new Error("Place not found");
      return place;
    },
    enabled: !!id,
  });
};

export const useCreatePlace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlaceRequest) => {
      await delay(500);

      // Convert Files to mock image URLs
      const images = data.images.map((_, index) => ({
        id: `img-${Date.now()}-${index}`,
        url: `https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&sig=${Date.now()}-${index}`,
        order: index,
      }));

      const placeData = {
        ...data,
        images,
      };

      return MockDataService.createPlace(placeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      toast.success("Place created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create place");
    },
  });
};

export const useUpdatePlace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePlaceRequest) => {
      await delay(500);

      const updates: Partial<Place> = { ...data };

      // Handle image uploads if present
      if (data.images && data.images.length > 0) {
        updates.images = data.images.map((_, index) => ({
          id: `img-${Date.now()}-${index}`,
          url: `https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&sig=${Date.now()}-${index}`,
          order: index,
        }));
      }

      const result = MockDataService.updatePlace(data.id, updates);
      if (!result) throw new Error("Failed to update place");
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["place", variables.id] });
      toast.success("Place updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update place");
    },
  });
};

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PlaceStatus }) => {
      await delay(300);
      const result = MockDataService.updatePlace(id, { status });
      if (!result) throw new Error("Failed to update status");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      toast.success("Status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status");
    },
  });
};
