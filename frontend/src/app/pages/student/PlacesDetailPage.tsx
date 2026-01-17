import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlace } from "../../../hooks/usePlaces";
import { Button } from "../../components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../../components/ui/carousel";
import {
  CheckCircle,
  XCircle,
  MapPin,
  Home,
  DollarSign,
  Building2,
  GraduationCap,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { ImageGalleryModal } from "../../components/common/ImageGalleryModal";
import { BidForm } from "../../components/bids/BidForm";
import { HomeHeader } from "../../components/home";
import {
  PlaceImage,
  ACCOMMODATION_TYPE_LABELS,
} from "../../../types/place.types";

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
      <div className="min-h-screen bg-bg">
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
      <div className="min-h-screen bg-bg">
        <HomeHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-fg mb-2">Place not found</h2>
            <Button onClick={() => navigate(ROUTES.HOME)} className="btn-bid">
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter to only PlaceImage types
  const allImages = place.images.filter(isPlaceImage);

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={allImages}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Image Carousel */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <Carousel className="w-full">
            <CarouselContent>
              {allImages.length > 0 ? (
                allImages.map((image, index) => (
                  <CarouselItem key={image.id || index}>
                    <div
                      className="relative h-80 cursor-pointer"
                      onClick={() => openGallery(index)}
                    >
                      <img
                        src={image.url}
                        alt={`${place.name} ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg hover:opacity-95 transition-opacity"
                      />
                      {/* Overlay with Title - only on first slide */}
                      {index === 0 && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-lg pointer-events-none">
                          <div className="absolute bottom-6 left-6">
                            <p className="text-muted text-sm mb-1">
                              Student-Only:
                            </p>
                            <h1 className="text-4xl font-bold text-white">
                              {place.name}
                            </h1>
                          </div>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div
                    className="relative h-80 cursor-pointer"
                    onClick={() => openGallery(0)}
                  >
                    <img
                      src="/placeholder-hotel.jpg"
                      alt={place.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-lg pointer-events-none">
                      <div className="absolute bottom-6 left-6">
                        <p className="text-muted text-sm mb-1">Student-Only:</p>
                        <h1 className="text-4xl font-bold text-white">
                          {place.name}
                        </h1>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {allImages.length > 1 && (
              <>
                <CarouselPrevious className="left-4 bg-glass-2 hover:bg-glass text-fg border-line" />
                <CarouselNext className="right-4 bg-glass-2 hover:bg-glass text-fg border-line" />
              </>
            )}
          </Carousel>
          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none">
              {allImages.length} photos
            </div>
          )}
        </div>

        {/* Student Verification Stepper */}
        <div className="glass-2 rounded-2xl p-6 border border-line mb-8">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-5 w-5 text-brand" />
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              Ready? Submit your bid <ArrowRight className="h-4 w-4" /> Verify{" "}
              <ArrowRight className="h-4 w-4" /> Sleep cheap.
            </h3>
          </div>
          <p className="text-sm text-muted mb-6">
            To unlock student-only pricing, verify a valid university email
            (.edu or international equivalent). Don't have one? Upload your
            student ID instead.
          </p>

          {/* Stepper */}
          <div className="flex items-start justify-between relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center z-10 flex-1">
              <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                1
              </div>
              <h4 className="font-semibold text-fg text-sm mb-1">
                Name Your Price
              </h4>
              <p className="text-xs text-muted max-w-[140px]">
                Enter check-in/out dates and your bid per night
              </p>
            </div>

            {/* Arrow 1 */}
            <div className="flex items-center justify-center pt-2 z-10">
              <ArrowRight className="h-6 w-6 text-brand/60" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center z-10 flex-1">
              <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                2
              </div>
              <h4 className="font-semibold text-fg text-sm mb-1">
                Verify Your .edu
              </h4>
              <p className="text-xs text-muted max-w-[140px]">
                Confirm you're a student to unlock exclusive rates
              </p>
            </div>

            {/* Arrow 2 */}
            <div className="flex items-center justify-center pt-2 z-10">
              <ArrowRight className="h-6 w-6 text-brand/60" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center z-10 flex-1">
              <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                3
              </div>
              <h4 className="font-semibold text-fg text-sm mb-1">
                Sleep Cheap
              </h4>
              <p className="text-xs text-muted max-w-[140px]">
                Get accepted or rejected immediately—no waiting
              </p>
            </div>
          </div>

          {/* Key benefits */}
          <div className="mt-6 pt-4 border-t border-line flex justify-center gap-8">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Shield className="h-4 w-4 text-success" />
              <span>No charge if rejected</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Zap className="h-4 w-4 text-warning" />
              <span>Instant confirmation</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Description & Bid Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-2 rounded-2xl p-6 border border-line">
              <div className="flex gap-8">
                {/* Description */}
                <div className="flex flex-1 flex-col gap-5">
                  <h2 className="text-2xl font-bold text-fg mb-2">
                    {place.shortDescription ||
                      `Shared Social Pods in ${place.city}.`}
                  </h2>

                  {/* Quick Info */}
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-2 text-muted">
                      <Building2 className="h-5 w-5 text-muted" />
                      <span className="text-sm">
                        {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <MapPin className="h-5 w-5 text-muted" />
                      <span className="text-sm">
                        {place.city}, {place.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <DollarSign className="h-5 w-5 text-muted" />
                      <span className="text-sm">
                        ${place.retailPrice}/night retail
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <Home className="h-5 w-5 text-muted" />
                      <span className="text-sm">{place.address}</span>
                    </div>
                  </div>
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
            <div className="glass-2 rounded-2xl p-6 border border-line">
              <h3 className="text-lg font-semibold text-fg mb-4">
                Your Potential Outcomes
              </h3>

              {/* Accepted Outcome */}
              <div className="glass rounded-xl p-4 mb-3 border border-line">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-fg">Bid Accepted!</h4>
                    <p className="text-sm text-muted">
                      Automatically accepted based on hotel's minimum price
                      rules.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rejected Outcome */}
              <div className="glass rounded-xl p-4 border border-line">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-danger rounded-full flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-fg">Rejected Bid</h4>
                    <p className="text-sm text-muted">
                      No charge. Try adjusting your dates or price.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section - Only show if lat/lng exist */}
        {place.latitude && place.longitude && (
          <div className="mt-8">
            <div className="glass-2 rounded-2xl p-6 border border-line">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-muted" />
                <h3 className="text-lg font-semibold text-fg">Location</h3>
              </div>
              <p className="text-muted mb-4">{place.address}</p>
              <div className="relative w-full h-80 rounded-lg overflow-hidden border border-line">
                <iframe
                  title="Place Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    place.longitude - 0.01
                  },${place.latitude - 0.01},${place.longitude + 0.01},${
                    place.latitude + 0.01
                  }&layer=mapnik&marker=${place.latitude},${place.longitude}`}
                />
              </div>
              <div className="mt-2 text-right">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=16/${place.latitude}/${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  View larger map →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
