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
  email?: string | null;
  latitude?: number;
  longitude?: number;
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
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

export interface PlaceResponse {
  place: Place;
}

export interface PlacesResponse {
  places: Place[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePlacePayload {
  name: string;
  shortDescription: string;
  fullDescription: string;
  city: string;
  country: string;
  address: string;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images: { url: string; order: number }[];
  accommodationType: string;
  retailPrice: number;
  minimumBid: number;
  autoAcceptAboveMinimum: boolean;
  blackoutDates: string[];
  status: PlaceStatus;
}

export interface Testimonial {
  id: string;
  rating: number; // 1-5
  title: string;
  content: string;
  author: string;
  authorRole?: string;
}

export interface ReviewPlatform {
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  icon: "google" | "yelp";
}
