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
  endpoint: string | ((variables: TVariables) => string);
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  showErrorToast?: boolean;
  transformVariables?: (variables: TVariables) => unknown;
}

export function useApiQuery<TData = unknown>(
  options: UseApiQueryOptions<TData>
) {
  const { queryKey, endpoint, params, ...restOptions } = options;

  // remove undefined values from params
  const filteredParams = Object.fromEntries(
    Object.entries(params ?? {}).filter(([_, v]) => v !== undefined)
  );
  const queryString = new URLSearchParams(filteredParams).toString();

  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: () => apiClient.get<TData>(`${endpoint}?${queryString}`),
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
    transformVariables,
    onError,
    ...restOptions
  } = options;

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const resolvedEndpoint =
        typeof endpoint === "function" ? endpoint(variables) : endpoint;
      const payload = transformVariables
        ? transformVariables(variables)
        : variables;

      switch (method) {
        case "POST":
          return apiClient.post<TData>(resolvedEndpoint, payload);
        case "PUT":
          return apiClient.put<TData>(resolvedEndpoint, payload);
        case "PATCH":
          return apiClient.patch<TData>(resolvedEndpoint, payload);
        case "DELETE":
          return apiClient.delete<TData>(resolvedEndpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onError: (error, variables, context) => {
      if (showErrorToast) {
        toast.error(error?.message || "An error occurred");
      }
      if (onError) {
        (
          onError as (
            error: ApiError,
            variables: TVariables,
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...restOptions,
  });
}
