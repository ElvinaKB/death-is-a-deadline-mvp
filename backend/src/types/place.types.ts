type PlaceStatus = "DRAFT" | "LIVE" | "PAUSED";

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
  source: "google" | "yelp";
}
