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
