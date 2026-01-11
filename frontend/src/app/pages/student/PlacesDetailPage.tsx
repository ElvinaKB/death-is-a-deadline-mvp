import { useNavigate, useParams } from "react-router-dom";
import { usePlace } from "../../../hooks/usePlaces";
import { ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../components/ui/carousel";
import { MapPin, Info } from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { BidForm } from "../../components/bids/BidForm";

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePlace(id || "");
  const place = data?.place;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <SkeletonLoader className="h-96 mb-6" />
          <SkeletonLoader className="h-64" />
        </div>
      </div>
    );
  }

  if (!place || !id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Place not found</h2>
          <Button onClick={() => navigate(ROUTES.HOME)}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Image Carousel */}
        <Card className="overflow-hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {place.images.map((image) => (
                <CarouselItem key={image.id}>
                  <div className="aspect-video relative">
                    <img
                      src={image.url}
                      alt={place.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {place.images.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Place Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold">{place.name}</h1>
                <Badge>
                  {ACCOMMODATION_TYPE_LABELS[place.accommodationType]}
                </Badge>
              </div>

              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                <span>
                  {place.address}, {place.city}, {place.country}
                </span>
              </div>

              <div className="flex items-center gap-4 py-4 border-y">
                <div>
                  <p className="text-sm text-muted-foreground">Retail Price</p>
                  <p className="text-2xl font-bold">
                    ${place.retailPrice}
                    <span className="text-base font-normal">/night</span>
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Bid</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${place.minimumBid}
                    <span className="text-base font-normal">/night</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {place.fullDescription}
              </p>
            </div>

            {place.blackoutDates.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">
                        Blackout Dates
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        The following dates are not available for booking:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {place.blackoutDates.map((dateStr, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-white"
                          >
                            {format(new Date(dateStr), "MMM dd, yyyy")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bid Section */}
          <div className="lg:col-span-1">
            <BidForm place={place} placeId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
