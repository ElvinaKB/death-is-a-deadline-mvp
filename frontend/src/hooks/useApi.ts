import {
  useMutation,
  useQuery,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { ApiError } from "../types/api.types";
import { toast } from "sonner";

interface UseApiQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, ApiError>, "queryKey" | "queryFn"> {
  queryKey: unknown[];
  endpoint: string;
  params?: Record<string, any>;
}

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn"> {
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  showErrorToast?: boolean;
}

export function useApiQuery<TData = unknown>(
  options: UseApiQueryOptions<TData>
) {
  const { queryKey, endpoint, params, ...restOptions } = options;

  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: () =>
      apiClient.get<TData>(
        `${endpoint}?${new URLSearchParams(params).toString()}`
      ),
    ...restOptions,
  });
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TVariables>
) {
  const {
    endpoint,
    method = "POST",
    showErrorToast = true,
    onError,
    ...restOptions
  } = options;

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      switch (method) {
        case "POST":
          return apiClient.post<TData>(endpoint, variables);
        case "PUT":
          return apiClient.put<TData>(endpoint, variables);
        case "PATCH":
          return apiClient.patch<TData>(endpoint, variables);
        case "DELETE":
          return apiClient.delete<TData>(endpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onError: (error, variables, onMutateResult, context) => {
      if (showErrorToast) {
        toast.error(error?.message || "An error occurred");
      }
      onError?.(error, variables, onMutateResult, context);
    },
    ...restOptions,
  });
}
