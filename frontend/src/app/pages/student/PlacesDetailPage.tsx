import {
  Building2,
  CheckCircle,
  ChevronRight,
  DollarSign,
  GraduationCap,
  Home,
  MapPin,
  Shield,
  XCircle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { useNavigate, useParams } from "react-router-dom";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES, getRoute } from "../../../config/routes.config";
import { useApiQuery } from "../../../hooks/useApi";
import { usePublicPlace } from "../../../hooks/usePlaces";
import {
  ACCOMMODATION_TYPE_LABELS,
  PlaceImage,
  PlacesResponse,
} from "../../../types/place.types";
import { BidForm } from "../../components/bids/BidForm";
import { ImageGalleryModal } from "../../components/common/ImageGalleryModal";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { HomeHeader } from "../../components/home";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import placeDetailBackgroundImage from "../../../assets/place-details.jpeg";
import { Testimonials } from "../../components/places/Testimonials";

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX;

// FAQ data
const FAQ_DATA = [
  {
    id: "rejected",
    question: "What happens if my bid is rejected?",
    answer:
      "If your bid is rejected, you won't be charged anything. You can try again with a different price or choose different dates. The rejection happens instantly, so you'll know right away.",
  },
  {
    id: "edu-email",
    question: "Why do I need a .edu email?",
    answer:
      "We require a .edu email to verify that you're a current student. This helps us maintain the exclusive student-only pricing that hotels offer through our platform.",
  },
  {
    id: "charged",
    question: "Will my card be charged?",
    answer:
      "Your card is only charged if your bid is accepted. We securely store your payment information, but no charge is made until a hotel accepts your offer.",
  },
  {
    id: "cancel",
    question: "Can I cancel a bid?",
    answer:
      "Once a bid is accepted, it's considered a confirmed booking and follows standard hotel cancellation policies. Pending bids can be cancelled anytime before acceptance.",
  },
];

// Type guard to check if image is PlaceImage
const isPlaceImage = (image: PlaceImage | File): image is PlaceImage => {
  return "url" in image;
};

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  );
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);

  // Scroll to top when id changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  // Use public endpoint for students - includes inventory status when date is provided
  const { data, isLoading } = usePublicPlace(id || "", selectedDate);
  const place = data?.place;
  const inventoryMessage = data?.inventoryMessage;

  // Show sold out modal when inventory is exhausted
  useEffect(() => {
    if (inventoryMessage && selectedDate) {
      setShowSoldOutModal(true);
    }
  }, [inventoryMessage, selectedDate]);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Fetch similar places in the same city (limit 4, excluding current place)
  const { data: similarData } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "similar", id, place?.city],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params: { limit: 4, city: place?.city },
    enabled: !!id && !!place?.city,
  });

  // Filter out current place and limit to 3
  const similarPlaces = (similarData?.places ?? [])
    .filter((p) => p.id !== id)
    .slice(0, 3);

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
    <div
      className="min-h-screen bg-bg relative"
      style={{
        backgroundImage: `url(${placeDetailBackgroundImage})`,
        backgroundPosition: "center",
        // backgroundSize: "cover",
        // backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "rgba(20, 24, 36, 0.65)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <HomeHeader />

        {/* Image Gallery Modal */}
        <ImageGalleryModal
          images={allImages}
          initialIndex={galleryInitialIndex}
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />

        <div
          className="max-w-6xl mx-auto px-6 py-8"
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden mb-8 bg-center">
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                DEATH IS A DEADLINE
              </h1>
              <p className="text-lg text-gray-300 mb-2">
                Students, faculty — name your price.
              </p>
              <p className="text-lg text-gray-300 mb-2">
                A hotel may let you check in.
              </p>
              <p className="text-lg text-gray-300 mb-4">
                Checkout is never guaranteed.
              </p>
              <p className="text-muted italic mb-8">— The Grim Keeper</p>

              <Button
                onClick={() => {
                  document
                    .getElementById("main-content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                variant="outline"
                className="flex items-center gap-2 px-8 py-3 text-fg bg-transparent border-muted hover:bg-glass"
              >
                {" "}
                ⏳ START BIDDING
              </Button>
            </div>
          </div>

          {/* Hero Image Carousel */}
          <div
            id="main-content"
            className="relative rounded-2xl overflow-hidden mb-8"
          >
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
                          <p className="text-muted text-sm mb-1">
                            Student-Only:
                          </p>
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
                    <BidForm
                      place={place}
                      placeId={id}
                      onDateChange={setSelectedDate}
                      isInventoryExhausted={place.isInventoryExhausted}
                    />
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

          {/* Ready Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-fg mb-6 text-center">
              {"Ready? Bid -> Verify -> Pack your bag."}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Students Use This */}
              <Card className="flex p-5 items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-muted flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-muted" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">Students Use This</h3>
                  <p className="text-sm text-muted">
                    Save up to 60% of normal hotel rates.
                  </p>
                </div>
              </Card>

              {/* Instant accept or */}
              <Card className="flex p-5 items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-muted flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-muted" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">Instant accept or</h3>
                  <p className="text-sm text-muted">
                    Check-in double, decline or rejection
                  </p>
                </div>
              </Card>

              {/* Get instant decision */}
              <Card className="flex p-5 items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-muted flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-muted" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">
                    Get instant decision
                  </h3>
                  <p className="text-sm text-muted">
                    No charge. Try another price or date.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          <Testimonials placeId={id || ""} />

          {/* FAQ Accordion */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-fg mb-6">FAQ Accordion</h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_DATA.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="bg-glass-2 border border-line rounded-lg mb-3 px-4"
                >
                  <AccordionTrigger className="text-fg hover:no-underline">
                    "{faq.question}"
                  </AccordionTrigger>
                  <AccordionContent className="text-muted">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem value="" />
            </Accordion>
          </div>

          {/* Map Section - Only show if lat/lng exist */}
          {place.latitude && place.longitude && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-muted" />
                <h3 className="text-lg font-semibold text-fg">Location</h3>
              </div>
              <p className="text-muted mb-4">{place.address}</p>
              <div className="relative w-full h-80 rounded-lg overflow-hidden">
                <Map
                  initialViewState={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                    zoom: 14,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  mapboxAccessToken={MAPBOX_TOKEN}
                >
                  <NavigationControl position="top-right" />
                  <Marker
                    latitude={place.latitude}
                    longitude={place.longitude}
                    anchor="bottom"
                  >
                    <div
                      style={{
                        background: "linear-gradient(180deg, #283B66, #1E2A44)",
                        color: "#F5F3EE",
                        border: "1px solid #93A4C9",
                        padding: "6px 12px",
                        borderRadius: "12px",
                        fontWeight: 600,
                        fontSize: "12px",
                        boxShadow: "0 0 14px rgba(140, 160, 255, 0.45)",
                      }}
                    >
                      BID
                    </div>
                  </Marker>
                </Map>
              </div>
            </div>
          )}

          {/* Similar Listings */}
          {similarPlaces.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-fg mb-6">
                {place.city} Listings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarPlaces.map((listing) => {
                  const imageUrl =
                    (listing.images[0] as any)?.url ||
                    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400";
                  return (
                    <Card
                      key={listing.id}
                      className="cursor-pointer group gap-0"
                      onClick={() =>
                        navigate(
                          getRoute(ROUTES.PUBLIC_PLACE_DETAIL, {
                            id: listing.id,
                          }),
                        )
                      }
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-3">
                        <img
                          src={imageUrl}
                          alt={listing.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col p-2 flex-1  justify-between">
                        <div>
                          <h3 className="font-semibold text-fg mb-1 group-hover:text-brand transition-colors">
                            {listing.name}
                          </h3>
                          <p className="text-sm text-muted mb-2">
                            {listing.city} ·{" "}
                            {
                              ACCOMMODATION_TYPE_LABELS[
                                listing.accommodationType
                              ]
                            }
                          </p>
                          <p className="text-sm text-muted line-clamp-2">
                            {listing.shortDescription}
                          </p>
                        </div>

                        {/* Bid Button */}
                        <button
                          className="btn-bid mt-3 w-full text-sm p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              getRoute(ROUTES.PUBLIC_PLACE_DETAIL, {
                                id: listing.id,
                              }),
                            );
                          }}
                        >
                          ⏳ PLACE BID
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sold Out Modal - SweetAlert Style */}
      <Dialog open={showSoldOutModal} onOpenChange={setShowSoldOutModal}>
        <DialogContent className="sm:max-w-md bg-bg border-line text-center">
          <DialogHeader className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>
            <DialogTitle className="text-xl font-bold text-fg">
              Sold Out
            </DialogTitle>
            <DialogDescription className="text-muted text-base">
              {inventoryMessage ||
                "Inventory sold out for this day, try a different date or place"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              onClick={() => setShowSoldOutModal(false)}
              className="btn-bid px-8"
            >
              Try Different Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
