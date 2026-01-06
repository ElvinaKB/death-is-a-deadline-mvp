import { addDays, differenceInDays, format, isAfter, isBefore } from "date-fns";
import { useFormik } from "formik";
import {
  Calendar as CalendarIcon,
  CircleCheck,
  CircleX,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useBidForPlace, useCreateBid } from "../../../hooks/useBids";
import { Bid, BidStatus, CreateBidRequest } from "../../../types/bid.types";
import { Place } from "../../../types/place.types";
import { bidValidationSchema } from "../../../utils/validationSchemas";
import { SkeletonLoader } from "../common/SkeletonLoader";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";

interface BidFormProps {
  place: Place;
  placeId: string;
}

interface BidResultState {
  status: BidStatus;
  message?: string;
  totalAmount?: number;
  totalNights?: number;
}

export function BidForm({ place, placeId }: BidFormProps) {
  const createBid = useCreateBid();
  const { data: existingBidData, isLoading: isLoadingExistingBid } =
    useBidForPlace(placeId);

  const [bidResult, setBidResult] = useState<BidResultState | null>(null);

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
      const request: CreateBidRequest = {
        placeId,
        checkInDate: values.checkInDate!.toISOString(),
        checkOutDate: values.checkOutDate!.toISOString(),
        bidPerNight: Number(values.bidPerNight),
      };

      try {
        const result = await createBid.mutateAsync(request);
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
    if (isBefore(date, today) || isAfter(date, maxDate)) {
      return true;
    }
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

  // Loading state
  if (isLoadingExistingBid) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <SkeletonLoader className="h-6 w-32" />
          <SkeletonLoader className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <SkeletonLoader className="h-40" />
        </CardContent>
      </Card>
    );
  }

  // If user has existing bid for this place
  const existingBid = existingBidData?.bid;
  if (existingBid) {
    return <ExistingBidCard bid={existingBid} place={place} />;
  }

  // Show result after bid submission
  if (bidResult) {
    return (
      <BidResultCard
        bidResult={bidResult}
        place={place}
        formValues={formik.values}
        onTryAgain={handleTryAgain}
      />
    );
  }

  // Bid form
  return (
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
            <Label className="pb-2">Check-in Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formik.values.checkInDate && "text-muted-foreground"
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
                  onSelect={(date) => formik.setFieldValue("checkInDate", date)}
                  disabled={isDateBlocked}
                />
              </PopoverContent>
            </Popover>
            {formik.touched.checkInDate && formik.errors.checkInDate && (
              <p className="text-sm text-red-500 mt-1">
                {formik.errors.checkInDate}
              </p>
            )}
          </div>

          {/* Check-out Date */}
          <div>
            <Label className="pb-2">Check-out Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formik.values.checkOutDate && "text-muted-foreground"
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
            {formik.touched.checkOutDate && formik.errors.checkOutDate && (
              <p className="text-sm text-red-500 mt-1">
                {formik.errors.checkOutDate}
              </p>
            )}
          </div>

          {/* Bid Per Night */}
          <div>
            <Label className="pb-2" htmlFor="bidPerNight">
              Bid Per Night ($) *
            </Label>
            <Input
              id="bidPerNight"
              type="number"
              placeholder="Enter your bid"
              min="1"
              step="0.01"
              {...formik.getFieldProps("bidPerNight")}
            />
            {formik.touched.bidPerNight && formik.errors.bidPerNight && (
              <p className="text-sm text-red-500 mt-1">
                {formik.errors.bidPerNight}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Minimum bid: ${place.minimumBid}/night
            </p>
          </div>

          {/* Summary */}
          {calculateTotalNights() > 0 && formik.values.bidPerNight && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Nights:</span>
                <span className="font-medium">{calculateTotalNights()}</span>
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
                ✓ Bids at or above ${place.minimumBid}/night are auto-accepted
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
  );
}

// Component for displaying existing bid
function ExistingBidCard({ bid, place }: { bid: Bid; place: Place }) {
  const navigate = useNavigate();

  const statusConfig = {
    [BidStatus.PENDING]: {
      icon: Clock,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-500",
      title: "Bid Pending",
      titleColor: "text-yellow-900",
      description: "Your bid is awaiting review",
    },
    [BidStatus.ACCEPTED]: {
      icon: CircleCheck,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-500",
      title: "Bid Accepted!",
      titleColor: "text-green-900",
      description: "Congratulations! Your bid was accepted.",
    },
    [BidStatus.REJECTED]: {
      icon: CircleX,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      borderColor: "border-red-500",
      title: "Bid Rejected",
      titleColor: "text-red-900",
      description: bid.rejectionReason || "Your bid was not accepted.",
    },
  };

  const config = statusConfig[bid.status];
  const Icon = config.icon;

  return (
    <Card className={cn("sticky top-24", config.borderColor)}>
      <CardContent className="p-6 text-center">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            config.bgColor
          )}
        >
          <Icon className={cn("h-10 w-10", config.iconColor)} />
        </div>
        <h3 className={cn("text-xl font-bold mb-2", config.titleColor)}>
          {config.title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{config.description}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span>Check-in:</span>
            <span className="font-medium">
              {format(new Date(bid.checkInDate), "MMM dd, yyyy")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Check-out:</span>
            <span className="font-medium">
              {format(new Date(bid.checkOutDate), "MMM dd, yyyy")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Nights:</span>
            <span className="font-medium">{bid.totalNights}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bid Per Night:</span>
            <span className="font-medium">${bid.bidPerNight}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-semibold">Total Amount:</span>
            <span className="font-bold">${bid.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {bid.status === BidStatus.ACCEPTED && (
          <Button className="w-full mb-3">Proceed to Checkout</Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
        >
          Browse Other Places
        </Button>
      </CardContent>
    </Card>
  );
}

// Component for bid result after submission
function BidResultCard({
  bidResult,
  place,
  formValues,
  onTryAgain,
}: {
  bidResult: BidResultState;
  place: Place;
  formValues: { checkInDate?: Date; checkOutDate?: Date; bidPerNight: string };
  onTryAgain: () => void;
}) {
  const navigate = useNavigate();

  if (bidResult.status === BidStatus.ACCEPTED) {
    return (
      <Card className="sticky top-24 border-green-500">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CircleCheck className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Bid Accepted!
          </h3>
          <p className="text-sm text-green-700 mb-6">{bidResult.message}</p>

          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span>Check-in:</span>
              <span className="font-medium">
                {formValues.checkInDate &&
                  format(formValues.checkInDate, "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Check-out:</span>
              <span className="font-medium">
                {formValues.checkOutDate &&
                  format(formValues.checkOutDate, "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Nights:</span>
              <span className="font-medium">{bidResult.totalNights}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Bid Per Night:</span>
              <span className="font-medium">${formValues.bidPerNight}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-green-200">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold">
                ${bidResult.totalAmount?.toFixed(2)}
              </span>
            </div>
          </div>

          <Button className="w-full mb-3">Proceed to Checkout</Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
          >
            Back to Places
          </Button>
        </CardContent>
      </Card>
    );
  }

  // PENDING status result
  if (bidResult.status === BidStatus.PENDING) {
    return (
      <Card className="sticky top-24 border-yellow-500">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-yellow-900 mb-2">
            Bid Submitted!
          </h3>
          <p className="text-sm text-yellow-700 mb-6">{bidResult.message}</p>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span>Check-in:</span>
              <span className="font-medium">
                {formValues.checkInDate &&
                  format(formValues.checkInDate, "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Check-out:</span>
              <span className="font-medium">
                {formValues.checkOutDate &&
                  format(formValues.checkOutDate, "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Nights:</span>
              <span className="font-medium">{bidResult.totalNights}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Bid Per Night:</span>
              <span className="font-medium">${formValues.bidPerNight}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-yellow-200">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold">
                ${bidResult.totalAmount?.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
          >
            Browse Other Places
          </Button>
        </CardContent>
      </Card>
    );
  }

  // REJECTED status - should not happen on initial submit but handle it
  return (
    <Card className="sticky top-24 border-gray-300">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CircleX className="h-10 w-10 text-gray-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Bid Not Accepted
        </h3>
        <p className="text-sm text-gray-600 mb-6">{bidResult.message}</p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <p className="font-medium text-sm text-blue-900 mb-2">Suggestions:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Increase your bid amount (min: ${place.minimumBid}/night)</li>
            <li>• Try different dates</li>
            <li>• Consider the retail price: ${place.retailPrice}/night</li>
          </ul>
        </div>

        <Button className="w-full mb-3" onClick={onTryAgain}>
          Try Again
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(ROUTES.STUDENT_MARKETPLACE)}
        >
          Browse Other Places
        </Button>
      </CardContent>
    </Card>
  );
}
