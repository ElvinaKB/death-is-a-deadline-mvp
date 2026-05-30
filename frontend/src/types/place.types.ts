export enum AccommodationType {
  HOTEL = "HOTEL",
  MOTEL = "MOTEL",
  HOSTEL = "HOSTEL",
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
  /** Admin/hotel only — omitted from student marketplace API */
  minimumBid?: number;
  /** Admin/hotel only */
  autoAcceptAboveMinimum?: boolean;
  blackoutDates: string[]; // Array of ISO date strings
  allowedDaysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  maxInventory: number; // Maximum rooms/beds available per date
  status: PlaceStatus;
  createdAt: string;
  updatedAt: string;
  // Inventory status (only included when date is provided in public API)
  availableInventory?: number;
  isInventoryExhausted?: boolean;
  hasHotelAccount?: boolean;
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
  allowedDaysOfWeek: number[];
  maxInventory: number;
  status: PlaceStatus;
}

export interface UpdatePlaceRequest extends Partial<CreatePlaceRequest> {
  id: string;
}

export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  [AccommodationType.HOTEL]: "Hotel",
  [AccommodationType.MOTEL]: "Motel",
  [AccommodationType.HOSTEL]: "Hostel",
};

export interface PlaceResponse {
  place: Place;
  inventoryMessage?: string; // Message when inventory is exhausted
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
  allowedDaysOfWeek: number[];
  maxInventory: number;
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
