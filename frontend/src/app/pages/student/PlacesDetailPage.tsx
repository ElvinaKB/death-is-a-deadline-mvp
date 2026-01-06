import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { usePlace } from "../../../hooks/usePlaces";
import { useCreateBid } from "../../../hooks/useBids";
import { ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
import { BidStatus } from "../../../types/bid.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../components/ui/carousel";
import {
  ArrowLeft,
  MapPin,
  Calendar as CalendarIcon,
  CircleCheck,
  CircleX,
  Info,
} from "lucide-react";
import { format, differenceInDays, addDays, isAfter, isBefore } from "date-fns";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { cn } from "../../components/ui/utils";
import { bidValidationSchema } from "../../../utils/validationSchemas";

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePlace(id || "");
  const createBid = useCreateBid();
  const place = data?.place;

  const [bidResult, setBidResult] = useState<{
    status: BidStatus;
    message?: string;
    totalAmount?: number;
    totalNights?: number;
  } | null>(null);

  // Date restrictions: today to 30 days from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 30);

  const formik = useFormik({
    initialValues: {
      checkInDate: undefined as Date | undefined,
      checkOutDate: undefined as Date | undefined,
      bidPerNight: "",
    },
    validationSchema: bidValidationSchema,
    onSubmit: async (values) => {
      if (!place || !id) return;

      try {
        const result = await createBid.mutateAsync({
          placeId: id,
          checkInDate: values.checkInDate!.toISOString(),
          checkOutDate: values.checkOutDate!.toISOString(),
          bidPerNight: Number(values.bidPerNight),
        });

        setBidResult({
          status: result.status,
          message: result.message,
          totalAmount: result.bid.totalAmount,
          totalNights: result.bid.totalNights,
        });
      } catch (error) {
        console.error("Bid submission error:", error);
      }
    },
  });

  const isDateBlocked = (date: Date) => {
    // Check if date is outside allowed range
    if (isBefore(date, today) || isAfter(date, maxDate)) {
      return true;
    }

    // Check if date is in blackout dates
    if (place?.blackoutDates) {
      const dateStr = date.toISOString().split("T")[0];
      return place.blackoutDates.includes(dateStr);
    }

    return false;
  };

  const calculateTotalNights = () => {
    if (formik.values.checkInDate && formik.values.checkOutDate) {
      return differenceInDays(
        formik.values.checkOutDate,
        formik.values.checkInDate
      );
    }
    return 0;
  };

  const calculateTotalAmount = () => {
    const nights = calculateTotalNights();
    const bidAmount = Number(formik.values.bidPerNight) || 0;
    return nights * bidAmount;
  };

  const handleTryAgain = () => {
    setBidResult(null);
    formik.resetForm();
  };

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

  if (!place) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Place not found</h2>
          <Button onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}>
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
            {!bidResult ? (
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Submit Your Bid</CardTitle>
                  <CardDescription>
                    Bids allowed for dates within the next 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={formik.handleSubmit} className="space-y-4">
                    {/* Check-in Date */}
                    <div>
                      <Label>Check-in Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formik.values.checkInDate &&
                                "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formik.values.checkInDate
                              ? format(formik.values.checkInDate, "PPP")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formik.values.checkInDate}
                            onSelect={(date) =>
                              formik.setFieldValue("checkInDate", date)
                            }
                            disabled={isDateBlocked}
                          />
                        </PopoverContent>
                      </Popover>
                      {formik.touched.checkInDate &&
                        formik.errors.checkInDate && (
                          <p className="text-sm text-red-500 mt-1">
                            {formik.errors.checkInDate}
                          </p>
                        )}
                    </div>

                    {/* Check-out Date */}
                    <div>
                      <Label>Check-out Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formik.values.checkOutDate &&
                                "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formik.values.checkOutDate
                              ? format(formik.values.checkOutDate, "PPP")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formik.values.checkOutDate}
                            onSelect={(date) =>
                              formik.setFieldValue("checkOutDate", date)
                            }
                            disabled={isDateBlocked}
                          />
                        </PopoverContent>
                      </Popover>
                      {formik.touched.checkOutDate &&
                        formik.errors.checkOutDate && (
                          <p className="text-sm text-red-500 mt-1">
                            {formik.errors.checkOutDate}
                          </p>
                        )}
                    </div>

                    {/* Bid Per Night */}
                    <div>
                      <Label htmlFor="bidPerNight">Bid Per Night ($) *</Label>
                      <Input
                        id="bidPerNight"
                        type="number"
                        placeholder="Enter your bid"
                        min="1"
                        step="0.01"
                        {...formik.getFieldProps("bidPerNight")}
                      />
                      {formik.touched.bidPerNight &&
                        formik.errors.bidPerNight && (
                          <p className="text-sm text-red-500 mt-1">
                            {formik.errors.bidPerNight}
                          </p>
                        )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Minimum bid: ${place.minimumBid}/night
                      </p>
                    </div>

                    {/* Summary */}
                    {calculateTotalNights() > 0 &&
                      formik.values.bidPerNight && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Nights:</span>
                            <span className="font-medium">
                              {calculateTotalNights()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Bid Per Night:</span>
                            <span className="font-medium">
                              ${formik.values.bidPerNight}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold">Total Amount:</span>
                            <span className="font-bold text-lg">
                              ${calculateTotalAmount().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                    {place.autoAcceptAboveMinimum && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✓ Bids at or above ${place.minimumBid}/night are
                          auto-accepted
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createBid.isPending}
                    >
                      {createBid.isPending ? "Submitting..." : "Submit Bid"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card
                className={cn(
                  "sticky top-24",
                  bidResult.status === BidStatus.ACCEPTED
                    ? "border-green-500"
                    : "border-gray-300"
                )}
              >
                <CardContent className="p-6 text-center">
                  {bidResult.status === BidStatus.ACCEPTED ? (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CircleCheck className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-green-900 mb-2">
                        Bid Accepted!
                      </h3>
                      <p className="text-sm text-green-700 mb-6">
                        {bidResult.message}
                      </p>

                      <div className="bg-green-50 rounded-lg p-4 mb-6 text-left space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Check-in:</span>
                          <span className="font-medium">
                            {formik.values.checkInDate &&
                              format(formik.values.checkInDate, "MMM dd, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Check-out:</span>
                          <span className="font-medium">
                            {formik.values.checkOutDate &&
                              format(
                                formik.values.checkOutDate,
                                "MMM dd, yyyy"
                              )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Nights:</span>
                          <span className="font-medium">
                            {bidResult.totalNights}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Bid Per Night:</span>
                          <span className="font-medium">
                            ${formik.values.bidPerNight}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="font-semibold">Total Amount:</span>
                          <span className="font-bold">
                            ${bidResult.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Button className="w-full mb-3">
                        Proceed to Checkout
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
                      >
                        Back to Places
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CircleX className="h-10 w-10 text-gray-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Bid Not Accepted
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        {bidResult.message}
                      </p>

                      <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                        <p className="font-medium text-sm text-blue-900 mb-2">
                          Suggestions:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>
                            • Increase your bid amount (min: ${place.minimumBid}
                            /night)
                          </li>
                          <li>• Try different dates</li>
                          <li>
                            • Consider the retail price: ${place.retailPrice}
                            /night
                          </li>
                        </ul>
                      </div>

                      <Button className="w-full mb-3" onClick={handleTryAgain}>
                        Try Again
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
                      >
                        Browse Other Places
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
