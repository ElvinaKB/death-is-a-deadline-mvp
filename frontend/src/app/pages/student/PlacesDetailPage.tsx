import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlace } from "../../../hooks/usePlaces";
import { Button } from "../../components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { ImageGalleryModal } from "../../components/common/ImageGalleryModal";
import { BidForm } from "../../components/bids/BidForm";
import { HomeHeader } from "../../components/home";
import { PlaceImage } from "../../../types/place.types";

// Type guard to check if image is PlaceImage
const isPlaceImage = (image: PlaceImage | File): image is PlaceImage => {
  return "url" in image;
};

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePlace(id || "");
  const place = data?.place;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const openGallery = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <SkeletonLoader className="h-80 mb-6" />
          <SkeletonLoader className="h-64" />
        </div>
      </div>
    );
  }

  if (!place || !id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Place not found</h2>
            <Button onClick={() => navigate(ROUTES.HOME)}>
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter to only PlaceImage types
  const allImages = place.images.filter(isPlaceImage);
  // Get cover image (first image or placeholder)
  const coverImage = allImages[0]?.url || "/placeholder-hotel.jpg";
  // Get gallery images (remaining images for side thumbnails)
  const sideGalleryImages = allImages.slice(1, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={allImages}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Image Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <div className="flex gap-2 h-80">
            {/* Main Image */}
            <div
              className="flex-1 relative cursor-pointer"
              onClick={() => openGallery(0)}
            >
              <img
                src={coverImage}
                alt={place.name}
                className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
              />
              {/* Overlay with Title */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-lg pointer-events-none">
                <div className="absolute bottom-6 left-6">
                  <p className="text-gray-300 text-sm mb-1">Student-Only:</p>
                  <h1 className="text-4xl font-bold text-white">
                    {place.name}
                  </h1>
                </div>
              </div>
            </div>
            {/* Side Gallery */}
            {sideGalleryImages.length > 0 && (
              <div className="w-48 flex flex-col gap-2">
                {sideGalleryImages.map((image, index) => (
                  <div
                    key={image.id || index}
                    className="flex-1 relative cursor-pointer"
                    onClick={() => openGallery(index + 1)}
                  >
                    <img
                      src={image.url}
                      alt={`${place.name} ${index + 2}`}
                      className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Description & Bid Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex gap-8">
                {/* Description */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {place.shortDescription ||
                      `Shared Social Pods in ${place.city}.`}
                  </h2>
                </div>

                {/* Bid Form */}
                <div className="flex-1">
                  <BidForm place={place} placeId={id} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Potential Outcomes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Potential Outcomes
              </h3>

              {/* Accepted Outcome */}
              <div className="bg-gray-50 rounded-xl p-4 mb-3 border">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Bid Accepted!
                    </h4>
                    <p className="text-sm text-gray-500">
                      Automatically accepted based on hotel's minimum price
                      rules.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rejected Outcome */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Rejected Bid
                    </h4>
                    <p className="text-sm text-gray-500">
                      No charge. Try adjusting your dates or price.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
