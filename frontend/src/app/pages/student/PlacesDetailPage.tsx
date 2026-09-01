import {
  AlertTriangle,
  MapPin,
  Star,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { ROUTES } from "../../../config/routes.config";
import { getPublicPlacePath } from "../../../utils/placeUrl";
import { useApiQuery } from "../../../hooks/useApi";
import { usePublicPlace } from "../../../hooks/usePlaces";
import { useAppSelector } from "../../../store/hooks";
import { apiClient } from "../../../lib/apiClient";
import { hasCookieConsent } from "../../../utils/cookieConsent";
import { toApiDateOnly } from "../../../utils/dateHelpers";
import { getYouTubeEmbedUrl } from "../../../utils/videoEmbed";
import {
  ACCOMMODATION_TYPE_LABELS,
  PlaceImage,
  PlacesResponse,
} from "../../../types/place.types";
import { BidForm } from "../../components/bids/BidForm";
import { PriorStayBanner } from "../../components/bids/PriorStayBanner";
import { useBidForPlace } from "../../../hooks/useBids";
import { formatCurrency } from "../../../utils/currency";
import { resolvePlaceKeywords } from "../../../utils/amenities";
import { ImageGalleryModal } from "../../components/common/ImageGalleryModal";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { HomeHeader } from "../../components/home/HomeHeader";
import { useReviewPlatforms } from "../../../hooks/useTestimonials";
import { pickPreferredReviewPlatform } from "../../../utils/reviewPlatform";
import { ListingHeroCarousel } from "../../components/listing/ListingHeroCarousel";
import { PrivateThresholdBadgeIcon } from "../../components/listing/PrivateThresholdBadgeIcon";
import { Testimonials } from "../../components/places/Testimonials";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

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
    id: "eligibility",
    question: "Who can use Deadline?",
    answer:
      "Deadline is a private, verified-member marketplace — not open to the general public. You're instantly approved with a .edu, .gov, or approved corporate email address; everyone else can still join through manual ID or LinkedIn verification.",
  },
  {
    id: "hidden-fees",
    question: "Are there any hidden fees?",
    answer:
      "No. If a hotel charges a mandatory resort or parking fee, it's already included in the price shown before you confirm — never added afterward. Only government taxes may be collected separately by the hotel. Optional parking (where offered) is billed separately if you choose it, and pet fees are always separate — contact the hotel directly to ask about their pet policy before booking if you're traveling with one.",
  },
  {
    id: "charged",
    question: "When will my card be charged?",
    answer:
      "Your card is charged immediately when your bid is accepted, for the full price shown — including any mandatory hotel fee. If your bid is rejected, no charge is made. Government taxes are due at check-in, and the hotel will typically ask for a card on file for incidentals. Reservations are booked in your name and must be honored by you — please don't book a room for someone else who won't be present, as the hotel may ask for ID matching the reservation at check-in.",
  },
  {
    id: "cancel",
    question: "Can I cancel a bid?",
    answer:
      "For hotels located in California, state law entitles you to a full refund if you cancel within 24 hours of booking, as long as you booked at least 72 hours before check-in. For hotels in every other state, and for California bookings past that 24-hour window, your bid is binding and non-refundable once accepted — you agree to this when you accept our Terms of Use.",
    link: {
      label: "California SB 644 (Civil Code § 1748.81)",
      href: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB644",
    },
  },
];

// Type guard to check if image is PlaceImage
const isPlaceImage = (image: PlaceImage | File): image is PlaceImage => {
  return "url" in image;
};

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  /** Check-in date for single-night inventory API — only after user picks in bid form. */
  const [inventoryDate, setInventoryDate] = useState<string | undefined>();
  const [userPickedCheckIn, setUserPickedCheckIn] = useState(false);
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [bookingCheckIn, setBookingCheckIn] = useState<Date | undefined>();
  const [bookingCheckOut, setBookingCheckOut] = useState<Date | undefined>();

  // Scroll to top when slug changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setHeroImageIndex(0);
    setInventoryDate(undefined);
    setUserPickedCheckIn(false);
    setShowSoldOutModal(false);
  }, [slugParam]);

  // Use public endpoint for students - includes inventory status when date is provided
  const { data, isLoading } = usePublicPlace(slugParam || "", inventoryDate);
  const place = data?.place;
  const placeId = place?.id;
  const inventoryMessage = data?.inventoryMessage;

  const contextBidId = searchParams.get("bidId");

  const { data: placeBidContext } = useBidForPlace(placeId || "", {
    enabled: isAuthenticated && !!placeId,
    bidId: contextBidId,
  });
  const heroPriorStay =
    placeBidContext?.priorStay && !placeBidContext.bid
      ? placeBidContext.priorStay
      : null;
  const heroUpcomingStays =
    !contextBidId && placeBidContext?.upcomingStays?.length
      ? placeBidContext.upcomingStays
      : !contextBidId && placeBidContext?.upcomingStay
        ? [placeBidContext.upcomingStay]
        : [];

  // First-party browse event: a logged-in traveler viewed this listing.
  // Consent-gated (honors Reject + GPC via hasCookieConsent), fired once per
  // place per session, fire-and-forget. Powers the "explored but didn't bid"
  // signal in the behavioral analytics.
  useEffect(() => {
    if (!placeId || !isAuthenticated || !hasCookieConsent()) return;
    const key = `pv_${placeId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    apiClient
      .post(ENDPOINTS.EVENTS_PLACE_VIEW, { placeId })
      .catch(() => {});
  }, [placeId, isAuthenticated]);

  // Sold-out modal only after the user picks a check-in date (not from ?date= on load)
  useEffect(() => {
    if (inventoryMessage && userPickedCheckIn && inventoryDate) {
      setShowSoldOutModal(true);
    }
  }, [inventoryMessage, inventoryDate, userPickedCheckIn]);

  // Canonical slug URL (redirect legacy UUID links)
  useEffect(() => {
    if (!place?.slug || !slugParam || slugParam === place.slug) return;

    const query = searchParams.toString();
    navigate(`${getPublicPlacePath(place)}${query ? `?${query}` : ""}`, {
      replace: true,
    });
  }, [place?.slug, slugParam, searchParams, navigate]);

  // Fetch similar places in the same city (limit 4, excluding current place)
  const { data: reviewPlatformsData } = useReviewPlatforms(placeId || "");
  const reviewPlatforms = Array.isArray(reviewPlatformsData)
    ? reviewPlatformsData
    : [];
  const heroReview = pickPreferredReviewPlatform(reviewPlatforms);

  const { data: similarData } = useApiQuery<PlacesResponse>({
    queryKey: [QUERY_KEYS.PLACES, "similar", placeId, place?.city],
    endpoint: ENDPOINTS.PLACES_PUBLIC,
    params: { limit: 4, city: place?.city },
    enabled: !!placeId && !!place?.city,
  });

  // Filter out current place and limit to 3
  const similarPlaces = (similarData?.places ?? [])
    .filter((p) => p.id !== placeId)
    .slice(0, 3);

  const openGallery = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <HomeHeader />
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
          <SkeletonLoader className="h-80 mb-6" />
          <SkeletonLoader className="h-64" />
        </div>
      </div>
    );
  }

  if (!place || !slugParam) {
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
  const amenities = resolvePlaceKeywords(place.keywords);
  const heroSlideIndex =
    allImages.length > 0 ? Math.min(heroImageIndex, allImages.length - 1) : 0;
  const bookingNights =
    bookingCheckIn && bookingCheckOut
      ? Math.max(1, differenceInDays(bookingCheckOut, bookingCheckIn))
      : 0;
  const retailTotal =
    bookingNights > 0 ? place.retailPrice * bookingNights : 0;

  const heroRatingBadgeClass =
    "absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-black/85 cursor-pointer";

  const handleHeroRatingClick = () => {
    if (!heroReview?.url) return;
    window.open(heroReview.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />

      <ImageGalleryModal
        images={allImages}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <main id="main-content" className="mx-auto max-w-[1400px] px-4 py-2 sm:py-4 md:px-8 md:py-6 min-w-0" tabIndex={-1}>
        <div
          className={`listing-detail-grid gap-3 lg:gap-7${amenities.length === 0 ? " listing-detail-grid--no-amenities" : ""}`}
        >
          <div className="listing-detail-hero relative aspect-[16/9.5] overflow-hidden rounded-xl">
              <ListingHeroCarousel
                images={allImages}
                placeName={place.name}
                onImageClick={openGallery}
                onIndexChange={setHeroImageIndex}
              />
              {heroReview && (
                <button
                  type="button"
                  onClick={handleHeroRatingClick}
                  className={heroRatingBadgeClass}
                  aria-label={`${Number(heroReview.rating).toFixed(1)} stars on ${heroReview.source === "google" ? "Google" : "Yelp"}, ${heroReview.reviewCount} reviews`}
                >
                  <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                  <span className="text-fg">
                    {Number(heroReview.rating).toFixed(1)}
                  </span>
                  <span className="text-muted">
                    ({heroReview.reviewCount} reviews)
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openGallery(heroSlideIndex)}
                className="absolute bottom-4 right-4 z-10 rounded-lg bg-black/70 px-5 py-3 text-right backdrop-blur-sm hover:bg-black/80"
                aria-label="Open photo gallery"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Retail price
                </p>
                <p className="font-sans font-bold tracking-tight tabular-nums text-3xl leading-tight text-fg sm:text-4xl md:text-5xl">
                  {formatCurrency(place.retailPrice)}
                </p>
                {bookingNights > 0 && (
                  <p className="hidden text-xs text-muted sm:block">
                    {formatCurrency(retailTotal)} for {bookingNights} night
                    {bookingNights !== 1 ? "s" : ""}
                  </p>
                )}
              </button>
              <div className="listing-hero-overlay pointer-events-none absolute inset-0 flex flex-col justify-end p-4 pt-14 sm:p-5 sm:pt-16 md:p-6 md:pt-20">
                <span className="listing-type-pill w-fit mb-3">
                  {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl text-fg md:text-4xl leading-tight">
                  {place.name}
                </h1>
                {heroUpcomingStays.length > 0 && (
                  <PriorStayBanner
                    upcomingStays={heroUpcomingStays}
                    variant="pill"
                    kind="upcoming"
                    className="mt-3 w-fit"
                  />
                )}
                {heroPriorStay && (
                  <PriorStayBanner
                    priorStay={heroPriorStay}
                    variant="pill"
                    kind="completed"
                    className="mt-3 w-fit"
                  />
                )}
                <p className="mt-2 flex items-center gap-2 text-sm text-[hsl(0_0%_78%)]">
                  <MapPin className="h-4 w-4 shrink-0 text-gold" />
                  {place.address}
                </p>
              </div>
            </div>

          {amenities.length > 0 && (
            <div className="listing-detail-amenities flex flex-wrap items-center gap-x-5 gap-y-1 py-0.5">
              {amenities.map(({ id, label, icon: Icon }) => (
                <span
                  key={id}
                  className="listing-amenity-item inline-flex items-center gap-2"
                >
                  <Icon className="text-gold shrink-0" strokeWidth={1.5} />
                  {label}
                </span>
              ))}
            </div>
          )}

          <aside className="listing-detail-bid self-start lg:sticky lg:top-6">
            <BidForm
              variant="listing"
              place={place}
              placeId={place.id}
              contextBidId={contextBidId}
              onDateChange={(date) => {
                setUserPickedCheckIn(true);
                setInventoryDate(toApiDateOnly(date));
              }}
              onBookingDatesChange={(checkIn, checkOut) => {
                setBookingCheckIn(checkIn);
                setBookingCheckOut(checkOut);
              }}
              isInventoryExhausted={place.isInventoryExhausted}
            />
          </aside>

          <div className="listing-detail-retail">
              <div className="listing-edu-panel flex gap-3 items-start rounded-xl border border-line bg-glass-2 p-5">
                <PrivateThresholdBadgeIcon className="h-[54px] w-[54px] shrink-0 text-gold" />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-fg leading-snug">
                    Private hotel threshold
                  </p>
                  <p className="mt-1.5 text-sm text-[hsl(0_0%_72%)] leading-relaxed">
                    Hotels set hidden minimum prices for each night. If your bid
                    meets the hotel&apos;s private threshold, you instantly win the
                    room.
                  </p>
                </div>
              </div>
            </div>

          <div
            id="listing-amenities"
            className="listing-detail-about space-y-3 border-t border-line pt-6"
          >
            <h2 className="text-lg font-semibold text-fg">About this stay</h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {place.fullDescription}
            </p>
          </div>
        </div>

          <Testimonials placeId={place.id} />

          {/* FAQ Accordion (+ vertical video alongside it when the hotel has added one) */}
          <div className="mt-8 sm:mt-12">
            <div
              className={
                place.verticalVideoUrl
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
                  : ""
              }
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-fg mb-4 sm:mb-6">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_DATA.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="gold-card border-gold/20 rounded-lg mb-3 px-4"
                    >
                      <AccordionTrigger className="text-fg hover:no-underline">
                        "{faq.question}"
                      </AccordionTrigger>
                      <AccordionContent className="text-muted">
                        {faq.answer}
                        {faq.link && (
                          <>
                            {" "}
                            <a
                              href={faq.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold underline"
                            >
                              {faq.link.label}
                            </a>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  <AccordionItem value="" />
                </Accordion>
              </div>

              {place.verticalVideoUrl && (
                <div className="mx-auto w-full max-w-[300px] lg:max-w-none">
                  {(() => {
                    const embedUrl = getYouTubeEmbedUrl(place.verticalVideoUrl);
                    return embedUrl ? (
                      <iframe
                        key={embedUrl}
                        src={embedUrl}
                        className="w-full aspect-[9/16] rounded-xl bg-black lg:max-h-[520px] lg:w-auto lg:mx-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Property video"
                      />
                    ) : (
                      <video
                        key={place.verticalVideoUrl}
                        src={place.verticalVideoUrl}
                        className="w-full aspect-[9/16] rounded-xl object-cover bg-black lg:max-h-[520px] lg:w-auto lg:mx-auto"
                        controls
                        playsInline
                        muted
                        loop
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Map Section - Only show if lat/lng exist */}
          {place.latitude && place.longitude && (
            <div className="mt-8">
              <div
                className={
                  place.neighborhoodGuideText || place.neighborhoodGuideImageUrl
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
                    : ""
                }
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-muted" />
                    <h3 className="text-lg font-semibold text-fg">Location</h3>
                  </div>
                  <p className="text-muted mb-4">{place.address}</p>
                  <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-lg overflow-hidden">
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
                            background:
                              "linear-gradient(180deg, #283B66, #1E2A44)",
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

                {(place.neighborhoodGuideText ||
                  place.neighborhoodGuideImageUrl) && (
                  <div>
                    <h3 className="text-lg font-semibold text-fg mb-4">
                      Neighborhood
                    </h3>
                    {place.neighborhoodGuideImageUrl && (
                      <div className="w-full h-56 sm:h-72 md:h-80 rounded-lg overflow-hidden mb-4">
                        <img
                          src={place.neighborhoodGuideImageUrl}
                          alt={`${place.city} neighborhood`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {place.neighborhoodGuideText && (
                      <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                        {place.neighborhoodGuideText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Listings */}
          {similarPlaces.length > 0 && (
            <div className="mt-8 sm:mt-12">
              <h2 className="text-xl sm:text-2xl font-bold text-fg mb-4 sm:mb-6">
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
                      className="cursor-pointer group gap-0 gold-card border-gold/20 hover:border-gold/40 transition-colors"
                      onClick={() => navigate(getPublicPlacePath(listing))}
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
                          className="btn-bid mt-3 w-full h-11 text-sm font-semibold uppercase tracking-wide"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getPublicPlacePath(listing));
                          }}
                        >
                          Place Bid
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
      </main>

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
