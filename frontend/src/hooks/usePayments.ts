import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "./useApi";
import { ENDPOINTS, getEndpoint } from "../config/endpoints.config";
import {
  PaymentStatus,
  Payment,
  PaymentResponse,
  PaymentsListResponse,
  PaymentForBidResponse,
  SavedPaymentMethodsResponse,
  ConfirmPaymentData,
  CreatePaymentIntentRequest,
  CapturePaymentRequest,
  CancelPaymentRequest,
} from "../types/payment.types";

// ============ STUDENT HOOKS ============

// Create payment intent for a bid
export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PaymentResponse, CreatePaymentIntentRequest>({
    endpoint: ENDPOINTS.PAYMENT_CREATE_INTENT,
    method: "POST",
    onSuccess: () => {
      // Do not invalidate ["payments"] — that refetches saved-methods mid-checkout
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};

export const useSavedPaymentMethods = (enabled = true) => {
  return useApiQuery<SavedPaymentMethodsResponse>({
    queryKey: ["payments", "saved-methods"],
    endpoint: ENDPOINTS.PAYMENT_SAVED_METHODS,
    enabled,
  });
};

// Get payment for a specific bid
export const usePaymentForBid = (bidId: string) => {
  return useApiQuery<PaymentForBidResponse>({
    queryKey: ["payments", "bid", bidId],
    endpoint: getEndpoint(ENDPOINTS.PAYMENT_FOR_BID, { bidId }),
    enabled: !!bidId,
  });
};

// Read-only sync after Stripe.js (webhook is source of truth)
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation<ConfirmPaymentData, { id: string }>({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_CONFIRM, { id: vars.id }),
    method: "POST",
    transformVariables: () => ({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};

// ============ ADMIN HOOKS ============

// List all payments (admin)
export const usePayments = (params?: {
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}) => {
  return useApiQuery<PaymentsListResponse>({
    queryKey: ["payments", "admin", params],
    endpoint: ENDPOINTS.PAYMENTS_LIST,
    params,
  });
};

// Get single payment by ID (admin)
export const usePayment = (id: string) => {
  return useApiQuery<{ payment: Payment }>({
    queryKey: ["payments", id],
    endpoint: getEndpoint(ENDPOINTS.PAYMENT_DETAIL, { id }),
    enabled: !!id,
  });
};

// Capture payment (admin)
export const useCapturePayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation<
    PaymentResponse,
    { id: string } & CapturePaymentRequest
  >({
    endpoint: (vars) => getEndpoint(ENDPOINTS.PAYMENT_CAPTURE, { id: vars.id }),
    method: "POST",
    transformVariables: ({ adminNotes }) => ({ adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};

// Cancel payment (admin)
export const useCancelPayment = () => {
  const queryClient = useQueryClient();

  return useApiMutation<PaymentResponse, { id: string } & CancelPaymentRequest>(
    {
      endpoint: (vars) =>
        getEndpoint(ENDPOINTS.PAYMENT_CANCEL, { id: vars.id }),
      method: "POST",
      transformVariables: ({ reason, adminNotes }) => ({ reason, adminNotes }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["bids"] });
      },
    }
  );
};
