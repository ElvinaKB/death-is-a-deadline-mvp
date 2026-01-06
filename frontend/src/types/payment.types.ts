import { Bid } from "./bid.types";

export enum PaymentStatus {
  PENDING = "PENDING",
  REQUIRES_ACTION = "REQUIRES_ACTION",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export interface Payment {
  id: string;
  bidId: string;
  studentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeClientSecret?: string;
  authorizedAt?: string;
  capturedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  expiresAt?: string;
  failureReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  bid?: Bid;
}

// Request types
export interface CreatePaymentIntentRequest {
  bidId: string;
}

export interface CapturePaymentRequest {
  adminNotes?: string;
}

export interface CancelPaymentRequest {
  reason?: string;
  adminNotes?: string;
}

// Response types
export interface PaymentResponse {
  message: string;
  payment: Payment;
  clientSecret?: string;
}

export interface PaymentsListResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentForBidResponse {
  payment: Payment | null;
}
