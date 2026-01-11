import { addDays, differenceInDays, format, isAfter, isBefore } from "date-fns";
import { useFormik } from "formik";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  LogIn,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useBidForPlace, useCreateBid } from "../../../hooks/useBids";
import { useAppSelector } from "../../../store/hooks";
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
import { Badge } from "../ui/badge";
import { PaymentStatus } from "../../../types/payment.types";

interface BidFormProps {
  place: Place;
  placeId: string;
}

interface BidResultState {
  status: BidStatus;
  message?: string;
  totalAmount?: number;
  totalNights?: number;
  bidId?: string;
}

export function BidForm({ place, placeId }: BidFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const createBid = useCreateBid();
  const { data: existingBidData, isLoading: isLoadingExistingBid } =
    useBidForPlace(placeId);

  const [bidResult, setBidResult] = useState<BidResultState | null>(null);

  // If user is not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign In Required
          </CardTitle>
          <CardDescription>
            Please sign in to place a bid on this accommodation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Starting from{" "}
              <span className="font-semibold text-foreground">
                ${place.minimumBid}
              </span>{" "}
              per night
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              navigate(ROUTES.LOGIN, {
                state: { returnUrl: location.pathname },
              })
            }
          >
            Sign In to Place Bid
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              navigate(ROUTES.SIGNUP, {
                state: { returnUrl: location.pathname },
              })
            }
          >
            Create Account
          </Button>
        </CardContent>
      </Card>
    );
  }

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
          bidId: result.bid.id,
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
  const payment = bid.payment;
  const paymentStatus = payment?.status;

  // Payment status configuration
  const paymentStatusConfig: Record<
    string,
    { color: string; label: string; icon: React.ElementType }
  > = {
    PENDING: {
      color: "bg-yellow-100 text-yellow-800",
      label: "Payment Pending",
      icon: Clock,
    },
    REQUIRES_ACTION: {
      color: "bg-orange-100 text-orange-800",
      label: "Action Required",
      icon: Clock,
    },
    AUTHORIZED: {
      color: "bg-blue-100 text-blue-800",
      label: "Payment Authorized",
      icon: CheckCircle,
    },
    CAPTURED: {
      color: "bg-green-100 text-green-800",
      label: "Payment Complete",
      icon: CheckCircle,
    },
    CANCELLED: {
      color: "bg-gray-100 text-gray-800",
      label: "Payment Cancelled",
      icon: XCircle,
    },
    FAILED: {
      color: "bg-red-100 text-red-800",
      label: "Payment Failed",
      icon: XCircle,
    },
    EXPIRED: {
      color: "bg-gray-100 text-gray-800",
      label: "Authorization Expired",
      icon: Clock,
    },
  };

  // Determine checkout eligibility
  const canCheckout =
    bid.status === BidStatus.ACCEPTED &&
    (!payment ||
      paymentStatus === PaymentStatus.PENDING ||
      paymentStatus === PaymentStatus.FAILED ||
      paymentStatus === PaymentStatus.EXPIRED);
  const isPaymentAuthorized = paymentStatus === PaymentStatus.AUTHORIZED;
  const isPaymentCaptured = paymentStatus === PaymentStatus.CAPTURED;
  const isPaymentCancelled = paymentStatus === PaymentStatus.CANCELLED;

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
  const paymentConfig = paymentStatus
    ? paymentStatusConfig[paymentStatus]
    : null;

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
        <p className="text-sm text-gray-600 mb-4">{config.description}</p>

        {/* Payment Status Badge */}
        {paymentConfig && (
          <div className="mb-4">
            <Badge className={cn("text-sm py-1 px-3", paymentConfig.color)}>
              <paymentConfig.icon className="w-3 h-3 mr-1" />
              {paymentConfig.label}
            </Badge>
          </div>
        )}

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

        {/* Payment Actions */}
        {canCheckout && (
          <Button asChild className="w-full mb-3">
            <Link to={ROUTES.STUDENT_CHECKOUT.replace(":bidId", bid.id)}>
              <CreditCard className="w-4 h-4 mr-2" />
              {paymentStatus === "FAILED" || paymentStatus === "EXPIRED"
                ? "Retry Payment"
                : "Proceed to Checkout"}
            </Link>
          </Button>
        )}

        {isPaymentAuthorized && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md mb-3">
            <CheckCircle className="w-4 h-4" />
            <span>Payment authorized - awaiting confirmation</span>
          </div>
        )}

        {isPaymentCaptured && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md mb-3">
            <CheckCircle className="w-4 h-4" />
            <span>Payment complete - booking confirmed!</span>
          </div>
        )}

        {isPaymentCancelled && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-md mb-3">
            <XCircle className="w-4 h-4" />
            <span>Payment was cancelled</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(ROUTES.HOME)}
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

          {bidResult.bidId && (
            <Button asChild className="w-full mb-3">
              <Link
                to={ROUTES.STUDENT_CHECKOUT.replace(":bidId", bidResult.bidId)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Checkout
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(ROUTES.HOME)}
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
            onClick={() => navigate(ROUTES.HOME)}
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
          onClick={() => navigate(ROUTES.HOME)}
        >
          Browse Other Places
        </Button>
      </CardContent>
    </Card>
  );
}
