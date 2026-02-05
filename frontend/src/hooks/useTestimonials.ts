import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";
import { QUERY_KEYS } from "../config/queryKeys.config";
import { useApiMutation, useApiQuery } from "./useApi";

// Testimonial types
export interface Testimonial {
  id: string;
  placeId: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  authorRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialInput {
  placeId: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  authorRole?: string;
}

export interface UpdateTestimonialInput {
  id: string;
  rating?: number;
  title?: string;
  content?: string;
  author?: string;
  authorRole?: string;
}

// Review Platform types
export interface ReviewPlatform {
  id: string;
  placeId: string;
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  source: "google" | "yelp";
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPlatformInput {
  placeId: string;
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  source: "google" | "yelp";
}

export interface UpdateReviewPlatformInput {
  id: string;
  name?: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
  source?: "google" | "yelp";
}

// ============ TESTIMONIAL HOOKS ============

export const useTestimonials = (placeId: string) => {
  return useApiQuery<Testimonial[]>({
    queryKey: [QUERY_KEYS.TESTIMONIALS, placeId],
    endpoint: ENDPOINTS.TESTIMONIALS_LIST,
    params: { placeId },
    enabled: !!placeId,
  });
};

export const useCreateTestimonial = (
  placeId: string,
  onSubmit: VoidFunction,
) => {
  const queryClient = useQueryClient();

  return useApiMutation<Testimonial, CreateTestimonialInput>({
    endpoint: ENDPOINTS.TESTIMONIAL_CREATE,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TESTIMONIALS, placeId],
      });
      toast.success("Testimonial created successfully");
      onSubmit();
    },
  });
};

export const useUpdateTestimonial = (
  placeId: string,
  onSubmit: VoidFunction,
) => {
  const queryClient = useQueryClient();

  return useApiMutation<Testimonial, UpdateTestimonialInput>({
    endpoint: (data) =>
      getEndpoint(ENDPOINTS.TESTIMONIAL_UPDATE, { id: data.id }),
    method: "PUT",
    transformVariables: (data) => {
      const { id, ...rest } = data;
      return rest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TESTIMONIALS, placeId],
      });
      toast.success("Testimonial updated successfully");
      onSubmit();
    },
  });
};

export const useDeleteTestimonial = (placeId: string) => {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>({
    endpoint: (id) => getEndpoint(ENDPOINTS.TESTIMONIAL_DELETE, { id }),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TESTIMONIALS, placeId],
      });
      toast.success("Testimonial deleted successfully");
    },
  });
};

// ============ REVIEW PLATFORM HOOKS ============

export const useReviewPlatforms = (placeId: string) => {
  return useApiQuery<ReviewPlatform[]>({
    queryKey: [QUERY_KEYS.REVIEW_PLATFORMS, placeId],
    endpoint: ENDPOINTS.REVIEW_PLATFORMS_LIST,
    params: { placeId },
    enabled: !!placeId,
  });
};

export const useCreateReviewPlatform = (
  placeId: string,
  onSubmit: VoidFunction,
) => {
  const queryClient = useQueryClient();

  return useApiMutation<ReviewPlatform, CreateReviewPlatformInput>({
    endpoint: ENDPOINTS.REVIEW_PLATFORM_CREATE,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.REVIEW_PLATFORMS, placeId],
      });
      toast.success("Review platform created successfully");
      onSubmit();
    },
  });
};

export const useUpdateReviewPlatform = (
  placeId: string,
  onSubmit: VoidFunction,
) => {
  const queryClient = useQueryClient();

  return useApiMutation<ReviewPlatform, UpdateReviewPlatformInput>({
    endpoint: (data) =>
      getEndpoint(ENDPOINTS.REVIEW_PLATFORM_UPDATE, { id: data.id }),
    method: "PUT",
    transformVariables: (data) => {
      const { id, ...rest } = data;
      return rest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.REVIEW_PLATFORMS, placeId],
      });
      toast.success("Review platform updated successfully");
      onSubmit();
    },
  });
};

export const useDeleteReviewPlatform = (placeId: string) => {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>({
    endpoint: (id) => getEndpoint(ENDPOINTS.REVIEW_PLATFORM_DELETE, { id }),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.REVIEW_PLATFORMS, placeId],
      });
      toast.success("Review platform deleted successfully");
    },
  });
};
