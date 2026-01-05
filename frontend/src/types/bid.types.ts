export enum BidStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
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
  createdAt: string;
  updatedAt: string;
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
