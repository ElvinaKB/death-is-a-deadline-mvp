export enum BidStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export interface BidPlace {
  id: string;
  name: string;
  city: string;
  country: string;
  images: { id: string; url: string }[];
}

export interface BidPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  authorizedAt?: string;
  capturedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  expiresAt?: string;
}

export interface BidStudent {
  id: string;
  name: string;
  email: string;
}

export interface Bid {
  id: string;
  placeId: string;
  studentId: string;
  checkInDate: string;
  checkOutDate: string;
  bidPerNight: number;
  totalNights: number;
  totalAmount: number;
  status: BidStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  place?: BidPlace;
  payment?: BidPayment;
  student?: BidStudent;
}

export interface CreateBidRequest {
  placeId: string;
  checkInDate: string;
  checkOutDate: string;
  bidPerNight: number;
}

export interface BidResponse {
  bid: Bid;
  status: BidStatus;
  message?: string;
}

export interface MyBidsResponse {
  bids: Bid[];
  total: number;
  page: number;
  limit: number;
}

export interface BidDetailResponse {
  bid: Bid;
}

export interface UpdateBidStatusRequest {
  id: string;
  status: BidStatus;
  rejectionReason?: string;
}
