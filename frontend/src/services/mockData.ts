import { Place, PlaceStatus, AccommodationType } from "../types/place.types";
import { Bid, BidStatus } from "../types/bid.types";
import { User, UserRole, ApprovalStatus } from "../types/auth.types";

// Mock users with credentials
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

// Mock places data
export const MOCK_PLACES: Place[] = [
  {
    id: "place-2",
    name: "Cozy Campus Pod",
    shortDescription: "Affordable pod-style living near campus",
    fullDescription:
      "Innovative pod-sharing concept designed for budget-conscious students. Each pod features privacy curtains, personal storage, and shared common areas. Located just 5 minutes from campus.",
    city: "Boston",
    country: "USA",
    address: "456 College Ave, Boston, MA 02115",
    images: [
      {
        id: "img-4",
        url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
        order: 0,
      },
      {
        id: "img-5",
        url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        order: 1,
      },
    ],
    accommodationType: AccommodationType.POD_SHARE,
    retailPrice: 45,
    minimumBid: 30,
    autoAcceptAboveMinimum: false,
    blackoutDates: ["2026-01-15", "2026-01-16"],
    status: PlaceStatus.LIVE,
    createdAt: "2025-12-10T10:00:00Z",
    updatedAt: "2025-12-10T10:00:00Z",
  },
  {
    id: "place-3",
    name: "Sunset Hostel",
    shortDescription: "Vibrant hostel with ocean views",
    fullDescription:
      "Join our community of international students in this vibrant hostel featuring stunning ocean views. Enjoy our rooftop terrace, study lounges, and weekly social events.",
    city: "San Diego",
    country: "USA",
    address: "789 Beach Blvd, San Diego, CA 92101",
    images: [
      {
        id: "img-6",
        url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
        order: 0,
      },
      {
        id: "img-7",
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        order: 1,
      },
      {
        id: "img-8",
        url: "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800",
        order: 2,
      },
    ],
    accommodationType: AccommodationType.HOSTEL,
    retailPrice: 55,
    minimumBid: 40,
    autoAcceptAboveMinimum: true,
    blackoutDates: [],
    status: PlaceStatus.LIVE,
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "place-4",
    name: "Private Study Room",
    shortDescription: "Your own private space for focused studying",
    fullDescription:
      "Perfect for graduate students and researchers who need a quiet, private space. Fully furnished with a desk, ergonomic chair, high-speed internet, and en-suite bathroom.",
    city: "Chicago",
    country: "USA",
    address: "321 University Dr, Chicago, IL 60601",
    images: [
      {
        id: "img-9",
        url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
        order: 0,
      },
      {
        id: "img-10",
        url: "https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800",
        order: 1,
      },
    ],
    accommodationType: AccommodationType.PRIVATE_ROOM,
    retailPrice: 95,
    minimumBid: 75,
    autoAcceptAboveMinimum: false,
    blackoutDates: [],
    status: PlaceStatus.LIVE,
    createdAt: "2025-11-28T10:00:00Z",
    updatedAt: "2025-11-28T10:00:00Z",
  },
  {
    id: "place-6",
    name: "Eco-Friendly Student Pods",
    shortDescription: "Sustainable pod living for eco-conscious students",
    fullDescription:
      "Join our eco-conscious community in sustainably designed pods. Solar powered, water recycling, organic garden, and bike storage. Perfect for students who care about the environment.",
    city: "Portland",
    country: "USA",
    address: "888 Green Way, Portland, OR 97201",
    images: [
      {
        id: "img-12",
        url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
        order: 0,
      },
      {
        id: "img-13",
        url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
        order: 1,
      },
    ],
    accommodationType: AccommodationType.POD_SHARE,
    retailPrice: 50,
    minimumBid: 35,
    autoAcceptAboveMinimum: true,
    blackoutDates: [],
    status: PlaceStatus.DRAFT,
    createdAt: "2026-01-02T10:00:00Z",
    updatedAt: "2026-01-02T10:00:00Z",
  },
];

// Mock bids data
export const MOCK_BIDS: Bid[] = [];

// In-memory storage for runtime
let placesData = [...MOCK_PLACES];
let bidsData = [...MOCK_BIDS];

export const MockDataService = {
  // Places
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

  // Bids
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

  // Reset data
  resetData: () => {
    placesData = [...MOCK_PLACES];
    bidsData = [...MOCK_BIDS];
  },
};
