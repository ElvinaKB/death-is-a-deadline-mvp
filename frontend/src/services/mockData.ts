import { Place, PlaceStatus, AccommodationType } from "../types/place.types";
import { Bid, BidStatus } from "../types/bid.types";
import { User, UserRole, ApprovalStatus } from "../types/auth.types";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const MOCK_USERS: Record<string, User & { password: string }> = {
  "admin@bidplatform.com": {
    id: "admin-1",
    name: "Admin User",
    email: "admin@bidplatform.com",
    password: "admin123",
    role: UserRole.ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "student@university.edu": {
    id: "student-1",
    name: "John Student",
    email: "student@university.edu",
    password: "student123",
    role: UserRole.STUDENT,
    approvalStatus: ApprovalStatus.APPROVED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "hotel@example.com": {
    id: "hotel-1",
    name: "Hotel Owner",
    email: "hotel@example.com",
    password: "hotel123",
    role: UserRole.HOTEL_OWNER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const MOCK_PLACES: Place[] = [
  {
    id: "place-1",
    name: "Campus Inn",
    shortDescription: "Modern hotel steps from campus",
    fullDescription:
      "A comfortable stay for students with study lounges, fast WiFi, and flexible check-in. Ideal for weekend visits and parents weekends.",
    city: "New York",
    country: "USA",
    address: "100 University Pl, New York, NY 10003",
    latitude: 40.7306,
    longitude: -73.9866,
    images: [
      {
        id: "img-1",
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        order: 0,
      },
    ],
    accommodationType: AccommodationType.HOTEL,
    retailPrice: 120,
    minimumBid: 99,
    autoAcceptAboveMinimum: true,
    blackoutDates: [],
    allowedDaysOfWeek: ALL_DAYS,
    maxInventory: 8,
    status: PlaceStatus.LIVE,
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "place-2",
    name: "Downtown Motel",
    shortDescription: "Affordable motel near campus",
    fullDescription:
      "Budget-friendly motel designed for students. Features comfortable rooms with private bathrooms, free WiFi, and convenient location just 5 minutes from campus.",
    city: "Boston",
    country: "USA",
    address: "456 College Ave, Boston, MA 02115",
    latitude: 42.3601,
    longitude: -71.0589,
    images: [
      {
        id: "img-4",
        url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
        order: 0,
      },
    ],
    accommodationType: AccommodationType.MOTEL,
    retailPrice: 45,
    minimumBid: 30,
    autoAcceptAboveMinimum: false,
    blackoutDates: ["2026-01-15", "2026-01-16"],
    allowedDaysOfWeek: ALL_DAYS,
    maxInventory: 6,
    status: PlaceStatus.LIVE,
    createdAt: "2025-12-10T10:00:00Z",
    updatedAt: "2025-12-10T10:00:00Z",
  },
  {
    id: "place-3",
    name: "Sunset Hostel",
    shortDescription: "Vibrant hostel with ocean views",
    fullDescription:
      "Join our community of international students in this vibrant hostel featuring stunning ocean views.",
    city: "San Diego",
    country: "USA",
    address: "789 Beach Blvd, San Diego, CA 92101",
    latitude: 32.7157,
    longitude: -117.1611,
    images: [
      {
        id: "img-6",
        url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
        order: 0,
      },
    ],
    accommodationType: AccommodationType.HOSTEL,
    retailPrice: 55,
    minimumBid: 40,
    autoAcceptAboveMinimum: true,
    blackoutDates: [],
    allowedDaysOfWeek: ALL_DAYS,
    maxInventory: 10,
    status: PlaceStatus.LIVE,
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "place-4",
    name: "Elite Hotel",
    shortDescription: "Luxury hotel for discerning students",
    fullDescription:
      "Premium hotel experience designed for graduate students and researchers who appreciate comfort.",
    city: "Chicago",
    country: "USA",
    address: "321 University Dr, Chicago, IL 60601",
    latitude: 41.8781,
    longitude: -87.6298,
    images: [
      {
        id: "img-9",
        url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
        order: 0,
      },
    ],
    accommodationType: AccommodationType.HOTEL,
    retailPrice: 95,
    minimumBid: 75,
    autoAcceptAboveMinimum: false,
    blackoutDates: [],
    allowedDaysOfWeek: ALL_DAYS,
    maxInventory: 4,
    status: PlaceStatus.LIVE,
    createdAt: "2025-11-28T10:00:00Z",
    updatedAt: "2025-11-28T10:00:00Z",
  },
];

export const MOCK_BIDS: Bid[] = [];

let placesData = [...MOCK_PLACES];
let bidsData = [...MOCK_BIDS];

export const MockDataService = {
  getPlaces: () => placesData,
  getPlaceById: (id: string) => placesData.find((p) => p.id === id),
  createPlace: (place: Omit<Place, "id" | "createdAt" | "updatedAt">) => {
    const newPlace: Place = {
      ...place,
      id: `place-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    placesData.push(newPlace);
    return newPlace;
  },
  updatePlace: (id: string, updates: Partial<Place>) => {
    const index = placesData.findIndex((p) => p.id === id);
    if (index !== -1) {
      placesData[index] = {
        ...placesData[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return placesData[index];
    }
    return null;
  },
  deletePlace: (id: string) => {
    const index = placesData.findIndex((p) => p.id === id);
    if (index !== -1) {
      placesData.splice(index, 1);
      return true;
    }
    return false;
  },
  getBids: () => bidsData,
  getBidById: (id: string) => bidsData.find((b) => b.id === id),
  createBid: (bid: Omit<Bid, "id" | "createdAt" | "updatedAt">) => {
    const newBid: Bid = {
      ...bid,
      id: `bid-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    bidsData.push(newBid);
    return newBid;
  },
  resetData: () => {
    placesData = [...MOCK_PLACES];
    bidsData = [...MOCK_BIDS];
  },
};
