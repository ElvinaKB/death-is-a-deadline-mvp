export enum AccommodationType {
  POD_SHARE = "POD_SHARE",
  HOSTEL = "HOSTEL",
  SHARED_APARTMENT = "SHARED_APARTMENT",
  PRIVATE_ROOM = "PRIVATE_ROOM",
}

export enum PlaceStatus {
  DRAFT = "DRAFT",
  LIVE = "LIVE",
  PAUSED = "PAUSED",
}

export interface Place {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  city: string;
  country: string;
  address: string;
  images: PlaceImage[] | File[];
  accommodationType: AccommodationType;
  retailPrice: number;
  minimumBid: number;
  autoAcceptAboveMinimum: boolean;
  blackoutDates: string[]; // Array of ISO date strings
  status: PlaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceImage {
  id: string;
  url: string;
  order: number;
}

export interface CreatePlaceRequest {
  name: string;
  shortDescription: string;
  fullDescription: string;
  city: string;
  country: string;
  address: string;
  images: File[];
  accommodationType: AccommodationType;
  retailPrice: number;
  minimumBid: number;
  autoAcceptAboveMinimum: boolean;
  blackoutDates: string[];
  status: PlaceStatus;
}

export interface UpdatePlaceRequest extends Partial<CreatePlaceRequest> {
  id: string;
}

export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  [AccommodationType.POD_SHARE]: "Pod Share",
  [AccommodationType.HOSTEL]: "Hostel",
  [AccommodationType.SHARED_APARTMENT]: "Shared Apartment",
  [AccommodationType.PRIVATE_ROOM]: "Private Room",
};
