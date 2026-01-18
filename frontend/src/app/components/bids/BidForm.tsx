import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  eachDayOfInterval,
} from "date-fns";
import { useFormik } from "formik";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../../../lib/stripe";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  LogIn,
  XCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useState, useRef } from "react";
import type { StripeCardElement } from "@stripe/stripe-js";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useBidForPlace, useCreateBid } from "../../../hooks/useBids";
import {
  useCreatePaymentIntent,
  useConfirmPayment,
} from "../../../hooks/usePayments";
import { useAppSelector } from "../../../store/hooks";
import { Bid, BidStatus, CreateBidRequest } from "../../../types/bid.types";
import { Place } from "../../../types/place.types";
import { PaymentStatus } from "../../../types/payment.types";
import { bidValidationSchema } from "../../../utils/validationSchemas";
import { SkeletonLoader } from "../common/SkeletonLoader";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

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

// Inner form component that has access to Stripe context
function BidFormInner({ place, placeId }: BidFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const stripe = useStripe();
  const elements = useElements();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const createBid = useCreateBid();
  const createPaymentIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();

  const [bidResult, setBidResult] = useState<BidResultState | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const cardElementRef = useRef<StripeCardElement | null>(null);

  // Disable the query while processing to prevent unmounting the CardElement
  const { data: existingBidData, isLoading: isLoadingExistingBid } =
    useBidForPlace(placeId, {
      enabled: isAuthenticated && !isProcessing && !paymentSuccess,
    });

  // Date restrictions: tomorrow to 30 days from today (no same-day bookings)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);
  const maxDate = addDays(today, 30);

  // Helper function to confirm payment with card
  const confirmPaymentWithCard = async (
    clientSecret: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!stripe) {
      return { success: false, error: "Payment system not ready" };
    }

    // Try to get card element from ref first, then from elements
    const cardElement =
      cardElementRef.current || elements?.getElement(CardElement);
    if (!cardElement) {
      return {
        success: false,
        error: "Card input not found. Please re-enter your card details.",
      };
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      },
    );

    if (error) {
      return { success: false, error: error.message || "Payment failed" };
    }

    // For pre-auth, the status should be "requires_capture"
    if (
      paymentIntent &&
      (paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded")
    ) {
      return { success: true };
    }

    return { success: false, error: "Unexpected payment status" };
  };

  const formik = useFormik({
    initialValues: {
      checkInDate: undefined as Date | undefined,
      checkOutDate: undefined as Date | undefined,
      bidPerNight: "",
    },
    validationSchema: bidValidationSchema,
    onSubmit: async (values) => {
      setPaymentError(null);
      setIsProcessing(true);

      // Validate card is ready
      if (!isCardComplete || !stripe || !elements) {
        setPaymentError("Please enter valid card details");
        setIsProcessing(false);
        return;
      }

      const request: CreateBidRequest = {
        placeId,
        checkInDate: values.checkInDate!.toISOString(),
        checkOutDate: values.checkOutDate!.toISOString(),
        bidPerNight: Number(values.bidPerNight),
      };

      try {
        // Step 1: Create the bid
        const result = await createBid.mutateAsync(request);

        // Step 2: If bid is accepted, create payment intent and complete payment
        if (result.status === BidStatus.ACCEPTED) {
          // Create payment intent
          const paymentResult = await createPaymentIntent.mutateAsync({
            bidId: result.bid.id,
          });

          if (paymentResult.clientSecret) {
            setPaymentId(paymentResult.payment.id);

            // Step 3: Confirm payment with card for pre-authorization
            const confirmResult = await confirmPaymentWithCard(
              paymentResult.clientSecret,
            );
            // queryClient.invalidateQueries({ queryKey: ["bids"] });
            if (confirmResult.success) {
              // Step 4: Update our backend about the confirmation
              try {
                await confirmPayment.mutateAsync({
                  id: paymentResult.payment.id,
                });
                toast.success("Payment authorized! Your booking is confirmed.");
                setPaymentSuccess(true);
              } catch (err) {
                // Payment succeeded with Stripe but backend update failed
                toast.success("Payment authorized! Booking confirmed.");
                setPaymentSuccess(true);
              }
            } else {
              setPaymentError(confirmResult.error || "Payment failed");
            }
          } else {
            toast.success("Bid accepted!");
          }
          setIsProcessing(false);
        } else if (result.status === BidStatus.REJECTED) {
          setIsProcessing(false);
        } else {
          // PENDING status
          toast.info("Bid submitted! Awaiting review.");
          setIsProcessing(false);
        }

        setBidResult({
          status: result.status,
          message: result.message,
          totalAmount: result.bid.totalAmount,
          totalNights: result.bid.totalNights,
          bidId: result.bid.id,
        });
      } catch (error: any) {
        console.error("Bid submission error:", error);
        setPaymentError(error.message || "Failed to submit bid");
        setIsProcessing(false);
      }
    },
  });

  const isDateBlocked = (date: Date) => {
    // Block dates before tomorrow (no same-day bookings)
    if (isBefore(date, tomorrow) || isAfter(date, maxDate)) {
      return true;
    }
    if (place?.blackoutDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      return place.blackoutDates.includes(dateStr);
    }
    return false;
  };

  // Check if any date in the selected range is a blackout date
  const getBlackoutDatesInRange = () => {
    if (
      !formik.values.checkInDate ||
      !formik.values.checkOutDate ||
      !place?.blackoutDates
    ) {
      return [];
    }

    const datesInRange = eachDayOfInterval({
      start: formik.values.checkInDate,
      end: formik.values.checkOutDate,
    });

    return datesInRange.filter((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return place.blackoutDates.includes(dateStr);
    });
  };

  const blackoutDatesInRange = getBlackoutDatesInRange();

  const calculateTotalNights = () => {
    if (formik.values.checkInDate && formik.values.checkOutDate) {
      return differenceInDays(
        formik.values.checkOutDate,
        formik.values.checkInDate,
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
    setPaymentError(null);
    setPaymentId(null);
    setPaymentSuccess(false);
    formik.resetForm();
  };

  // Loading state
  if (isLoadingExistingBid) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-12" />
        <SkeletonLoader className="h-12" />
        <SkeletonLoader className="h-40" />
      </div>
    );
  }

  // Show payment success first (before checking existing bid)
  if (paymentSuccess && bidResult) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h3 className="text-xl font-bold text-success mb-2">
            Booking Confirmed!
          </h3>
          <p className="text-sm text-muted mb-4">
            Your payment has been authorized and your booking is confirmed.
          </p>
        </div>

        <div className="glass rounded-lg p-4 space-y-2 text-sm border border-line">
          <div className="flex justify-between">
            <span className="text-muted">Total Amount:</span>
            <span className="font-bold text-fg">
              ${bidResult.totalAmount?.toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-line text-fg hover:bg-glass"
          onClick={() => navigate(ROUTES.STUDENT_MY_BIDS)}
        >
          View My Bids
        </Button>
      </div>
    );
  }

  // If user has existing bid for this place (only check when not processing)
  const existingBid = existingBidData?.bid;
  if (existingBid && !isProcessing) {
    return <ExistingBidCard bid={existingBid} place={place} />;
  }

  // Show rejection result
  if (bidResult && bidResult.status === BidStatus.REJECTED) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-10 w-10 text-danger" />
          </div>
          <h3 className="text-xl font-bold text-danger mb-2">
            Bid Not Accepted
          </h3>
          <p className="text-sm text-muted mb-4">{bidResult.message}</p>
        </div>

        <div className="glass rounded-lg p-4 text-left border border-line">
          <p className="font-medium text-sm text-fg mb-2">Suggestions:</p>
          <ul className="text-sm text-muted space-y-1">
            <li>• Increase your bid amount </li>
            <li>• Try different dates</li>
          </ul>
        </div>

        <Button className="w-full btn-bid" onClick={handleTryAgain}>
          Try Again
        </Button>
      </div>
    );
  }

  // Bid form
  return (
    <div className="space-y-4">
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        {/* Check-in and Check-out in one row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Check-in Date */}
          <div>
            <Label className="text-sm text-muted mb-1.5 block">Check-in</Label>
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal h-11 bg-glass border-line text-fg",
                    !formik.values.checkInDate && "text-muted",
                  )}
                >
                  <span className="truncate">
                    {formik.values.checkInDate
                      ? format(formik.values.checkInDate, "MMM d")
                      : "Check-in"}
                  </span>
                  <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-bg border-line"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={formik.values.checkInDate}
                  onSelect={(date) => {
                    formik.setFieldValue("checkInDate", date);
                    setCheckInOpen(false);
                  }}
                  disabled={isDateBlocked}
                  className=" text-fg"
                />
              </PopoverContent>
            </Popover>
            {formik.touched.checkInDate && formik.errors.checkInDate && (
              <p className="text-xs text-danger mt-1">
                {formik.errors.checkInDate}
              </p>
            )}
          </div>

          {/* Check-out Date */}
          <div>
            <Label className="text-sm text-muted mb-1.5 block">Check-out</Label>
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal h-11 bg-glass border-line text-fg",
                    !formik.values.checkOutDate && "text-muted",
                  )}
                >
                  <span className="truncate">
                    {formik.values.checkOutDate
                      ? format(formik.values.checkOutDate, "MMM d")
                      : "Check-out"}
                  </span>
                  <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-bg border-line"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={formik.values.checkOutDate}
                  onSelect={(date) => {
                    formik.setFieldValue("checkOutDate", date);
                    setCheckOutOpen(false);
                  }}
                  disabled={isDateBlocked}
                  className="bg-bg-raised text-fg"
                />
              </PopoverContent>
            </Popover>
            {formik.touched.checkOutDate && formik.errors.checkOutDate && (
              <p className="text-xs text-danger mt-1">
                {formik.errors.checkOutDate}
              </p>
            )}
          </div>
        </div>

        {/* Bid Per Night */}
        <div>
          <Label className="text-sm text-muted mb-1.5 block">
            Your Bid Per Night
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              id="bidPerNight"
              type="number"
              min="1"
              step="0.01"
              className="pl-9 h-11 bg-glass border-line text-fg placeholder:text-muted"
              {...formik.getFieldProps("bidPerNight")}
            />
          </div>
          {formik.touched.bidPerNight && formik.errors.bidPerNight && (
            <p className="text-xs text-danger mt-1">
              {formik.errors.bidPerNight}
            </p>
          )}
        </div>

        {/* Summary */}
        {calculateTotalNights() > 0 && formik.values.bidPerNight && (
          <div className="glass rounded-lg p-3 space-y-1.5 text-sm border border-line">
            <div className="flex justify-between">
              <span className="text-muted">
                {calculateTotalNights()} nights × ${formik.values.bidPerNight}
              </span>
              <span className="font-semibold text-fg">
                ${calculateTotalAmount().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Blackout Date Warning */}
        {blackoutDatesInRange.length > 0 && (
          <div className="glass rounded-lg p-3 border border-warning/50">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-warning font-medium">
                  Selected dates include unavailable dates
                </p>
                <p className="text-muted text-xs mt-1">
                  The following dates are blocked:{" "}
                  {blackoutDatesInRange
                    .map((d) => format(d, "MMM d"))
                    .join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inline Card Input - Only for authenticated users */}
        {isAuthenticated && (
          <div className="space-y-2">
            <Label className="text-sm text-muted mb-1.5 block">
              Card Details
            </Label>
            <div className="border border-line rounded-lg p-3 bg-glass">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#f8fafc",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      "::placeholder": {
                        color: "#64748b",
                      },
                    },
                    invalid: {
                      color: "#ef4444",
                      iconColor: "#ef4444",
                    },
                  },
                }}
                onReady={(element) => {
                  cardElementRef.current = element;
                }}
                onChange={(e) => {
                  setIsCardComplete(e.complete);
                  if (e.error) {
                    setPaymentError(e.error.message);
                  } else {
                    setPaymentError(null);
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Your card will only be charged if your bid is accepted
            </p>
          </div>
        )}

        {/* Error Message */}
        {paymentError && (
          <div className="glass rounded-lg p-3 border border-danger/50">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{paymentError}</p>
            </div>
          </div>
        )}

        {/* Submit Button - Different for authenticated vs unauthenticated */}
        {isAuthenticated ? (
          <Button
            type="submit"
            className="w-full btn-bid h-12 text-base font-medium"
            disabled={
              isProcessing ||
              createBid.isPending ||
              blackoutDatesInRange.length > 0 ||
              !stripe ||
              !elements ||
              !isCardComplete ||
              !formik.values.checkInDate ||
              !formik.values.checkOutDate ||
              !formik.values.bidPerNight ||
              Number(formik.values.bidPerNight) <= 0
            }
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Place Bid
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full btn-bid h-12 text-base font-medium"
            onClick={() =>
              navigate(ROUTES.SIGNUP, {
                state: { returnUrl: location.pathname },
              })
            }
          >
            <LogIn className="w-4 h-4 mr-2" />
            Verify .edu & Submit Bid
          </Button>
        )}

        {/* Info Text */}
        <p className="text-xs text-center text-muted">
          {isAuthenticated ? (
            <>
              Secure Stripe Checkout. Card is only charged if bid is accepted.
              <br />
              Cancel anytime before acceptance.
            </>
          ) : (
            <>
              Student verification required. Verify your .edu email or upload
              <br />
              your student ID to unlock student-only pricing.
            </>
          )}
        </p>
      </form>
    </div>
  );
}

// Exported component that wraps the form with Elements provider
export function BidForm({ place, placeId }: BidFormProps) {
  if (!stripePromise) {
    return (
      <div className="text-center py-4 text-muted">
        Payment system not available
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <BidFormInner place={place} placeId={placeId} />
    </Elements>
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
      color: "bg-warning/20 text-warning",
      label: "Payment Pending",
      icon: Clock,
    },
    REQUIRES_ACTION: {
      color: "bg-warning/20 text-warning",
      label: "Action Required",
      icon: Clock,
    },
    AUTHORIZED: {
      color: "bg-brand/20 text-brand",
      label: "Payment Authorized",
      icon: CheckCircle,
    },
    CAPTURED: {
      color: "bg-success/20 text-success",
      label: "Payment Complete",
      icon: CheckCircle,
    },
    CANCELLED: {
      color: "bg-muted/20 text-muted",
      label: "Payment Cancelled",
      icon: XCircle,
    },
    FAILED: {
      color: "bg-danger/20 text-danger",
      label: "Payment Failed",
      icon: XCircle,
    },
    EXPIRED: {
      color: "bg-muted/20 text-muted",
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
      bgColor: "bg-warning/20",
      iconColor: "text-warning",
      borderColor: "border-warning/50",
      title: "Bid Pending",
      titleColor: "text-warning",
      description: "Your bid is awaiting review",
    },
    [BidStatus.ACCEPTED]: {
      icon: CircleCheck,
      bgColor: "bg-success/20",
      iconColor: "text-success",
      borderColor: "border-success/50",
      title: "Bid Accepted!",
      titleColor: "text-success",
      description: "Congratulations! Your bid was accepted.",
    },
    [BidStatus.REJECTED]: {
      icon: CircleX,
      bgColor: "bg-danger/20",
      iconColor: "text-danger",
      borderColor: "border-danger/50",
      title: "Bid Rejected",
      titleColor: "text-danger",
      description: bid.rejectionReason || "Your bid was not accepted.",
    },
  };

  const config = statusConfig[bid.status];
  const Icon = config.icon;
  const paymentConfig = paymentStatus
    ? paymentStatusConfig[paymentStatus]
    : null;

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            config.bgColor,
          )}
        >
          <Icon className={cn("h-10 w-10", config.iconColor)} />
        </div>
        <h3 className={cn("text-xl font-bold mb-2", config.titleColor)}>
          {config.title}
        </h3>
        <p className="text-sm text-muted mb-4">{config.description}</p>

        {/* Payment Status Badge */}
        {paymentConfig && (
          <div className="mb-4">
            <Badge className={cn("text-sm py-1 px-3", paymentConfig.color)}>
              <paymentConfig.icon className="w-3 h-3 mr-1" />
              {paymentConfig.label}
            </Badge>
          </div>
        )}
      </div>

      <div className="glass rounded-lg p-4 space-y-2 text-sm border border-line">
        <div className="flex justify-between">
          <span className="text-muted">Check-in:</span>
          <span className="font-medium text-fg">
            {format(new Date(bid.checkInDate), "MMM dd, yyyy")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Check-out:</span>
          <span className="font-medium text-fg">
            {format(new Date(bid.checkOutDate), "MMM dd, yyyy")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Bid Per Night:</span>
          <span className="font-medium text-fg">${bid.bidPerNight}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-line">
          <span className="font-semibold text-fg">Total:</span>
          <span className="font-bold text-fg">
            ${bid.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Actions */}
      {canCheckout && (
        <Button asChild className="w-full btn-bid">
          <Link to={ROUTES.STUDENT_CHECKOUT.replace(":bidId", bid.id)}>
            <CreditCard className="w-4 h-4 mr-2" />
            {paymentStatus === "FAILED" || paymentStatus === "EXPIRED"
              ? "Retry Payment"
              : "Complete Payment"}
          </Link>
        </Button>
      )}

      {isPaymentAuthorized && (
        <div className="flex items-center justify-center gap-2 text-sm text-brand glass px-3 py-2 rounded-md border border-brand/30">
          <CheckCircle className="w-4 h-4" />
          <span>Payment authorized - awaiting confirmation</span>
        </div>
      )}

      {isPaymentCaptured && (
        <div className="flex items-center justify-center gap-2 text-sm text-success glass px-3 py-2 rounded-md border border-success/30">
          <CheckCircle className="w-4 h-4" />
          <span>Payment complete - booking confirmed!</span>
        </div>
      )}

      {isPaymentCancelled && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted glass px-3 py-2 rounded-md border border-line">
          <XCircle className="w-4 h-4" />
          <span>Payment was cancelled</span>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full border-line text-fg hover:bg-glass"
        onClick={() => navigate(ROUTES.HOME)}
      >
        Browse Other Places
      </Button>
    </div>
  );
}
