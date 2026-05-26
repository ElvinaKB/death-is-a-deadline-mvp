import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { useFormik } from "formik";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeCardElement } from "@stripe/stripe-js";
import { stripePromise } from "../../../lib/stripe";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  LogIn,
  ArrowRight,
  XCircle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Lock,
  Moon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useBidForPlace, useCreateBid } from "../../../hooks/useBids";
import {
  useConfirmPayment,
  useCreatePaymentIntent,
} from "../../../hooks/usePayments";
import { useAppSelector } from "../../../store/hooks";
import { Bid, BidStatus, CreateBidRequest } from "../../../types/bid.types";
import { PaymentStatus } from "../../../types/payment.types";
import { Place } from "../../../types/place.types";
import {
  isDbPaymentAwaitingCapture,
  isLowBidRejection,
  isStripeActionRequired,
  shouldShowConfirmedOutcome,
  shouldShowRejectedOutcome,
  shouldShowStripeCompletionUI,
} from "../../../utils/bidOutcome";
import {
  BidPaymentElement,
  ExistingBidPaymentSection,
} from "./BidPaymentElement";
import { bidValidationSchema } from "../../../utils/validationSchemas";
import { SkeletonLoader } from "../common/SkeletonLoader";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import {
  BidCountdown,
  getSecondsUntilMidnight,
  ListingBidPanelHeader,
} from "./BidCountdown";
import { BidLockInModal } from "./BidLockInModal";
import { BidOutcomePanel } from "./BidOutcomePanel";
import { BidStepIndicator, type BidStep, STEPS } from "./BidStepIndicator";
import { formatCurrency } from "../../../utils/currency";
import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../../../utils/analytics";

// LocalStorage key for persisting bid form state
const BID_FORM_STORAGE_KEY = "pendingBidForm";

interface StoredBidFormState {
  placeId: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  bidPerNight: string;
  timestamp: number;
}

// Helper to save form state to localStorage
const saveBidFormToStorage = (
  placeId: string,
  values: { checkInDate?: Date; checkOutDate?: Date; bidPerNight: string },
) => {
  const state: StoredBidFormState = {
    placeId,
    checkInDate: values.checkInDate ? values.checkInDate.toISOString() : null,
    checkOutDate: values.checkOutDate
      ? values.checkOutDate.toISOString()
      : null,
    bidPerNight: values.bidPerNight,
    timestamp: Date.now(),
  };
  localStorage.setItem(BID_FORM_STORAGE_KEY, JSON.stringify(state));
};

// Helper to load form state from localStorage
const loadBidFormFromStorage = (
  placeId: string,
): { checkInDate?: Date; checkOutDate?: Date; bidPerNight: string } | null => {
  try {
    const stored = localStorage.getItem(BID_FORM_STORAGE_KEY);
    if (!stored) return null;

    const state: StoredBidFormState = JSON.parse(stored);

    // Only restore if it's for the same place and not older than 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    if (state.placeId !== placeId || Date.now() - state.timestamp > ONE_HOUR) {
      localStorage.removeItem(BID_FORM_STORAGE_KEY);
      return null;
    }

    return {
      checkInDate: state.checkInDate ? new Date(state.checkInDate) : undefined,
      checkOutDate: state.checkOutDate
        ? new Date(state.checkOutDate)
        : undefined,
      bidPerNight: state.bidPerNight,
    };
  } catch {
    localStorage.removeItem(BID_FORM_STORAGE_KEY);
    return null;
  }
};

// Helper to clear form state from localStorage
const clearBidFormStorage = () => {
  localStorage.removeItem(BID_FORM_STORAGE_KEY);
};

interface BidFormProps {
  place: Place;
  placeId: string;
  onDateChange?: (date: string | undefined) => void;
  onBookingDatesChange?: (checkIn?: Date, checkOut?: Date) => void;
  isInventoryExhausted?: boolean;
  variant?: "default" | "listing";
}

interface BidResultState {
  /** From API: ACCEPTED | REJECTED (preview) — use BidStatus, not a separate outcome enum */
  bidStatus: BidStatus;
  message?: string;
  totalAmount?: number;
  totalNights?: number;
  bidId?: string;
  /** Set after Stripe confirm succeeds in this session */
  paymentComplete?: boolean;
}

interface StripeCompletionState {
  clientSecret: string;
  paymentId: string;
  totalAmount: number;
  bidId: string;
}

// Inner form component that has access to Stripe context
function BidFormInner({
  place,
  placeId,
  onDateChange,
  onBookingDatesChange,
  isInventoryExhausted,
  variant = "default",
}: BidFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
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
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [isChangingCard, setIsChangingCard] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [stripeCompletion, setStripeCompletion] =
    useState<StripeCompletionState | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [bidStep, setBidStep] = useState<BidStep>("dates");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [lockInOpen, setLockInOpen] = useState(false);
  const [isRebidding, setIsRebidding] = useState(false);
  const [auctionSeconds, setAuctionSeconds] = useState(() =>
    getSecondsUntilMidnight(),
  );
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const isListing = variant === "listing";

  // Load saved form state from localStorage
  const savedFormState = loadBidFormFromStorage(placeId);

  const { data: existingBidData, isLoading: isLoadingExistingBid } =
    useBidForPlace(placeId, {
      enabled:
        isAuthenticated &&
        !isProcessing &&
        !bidResult &&
        !stripeCompletion,
    });

  // Date restrictions: today to 30 days from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 30);

  const persistCardPaymentMethod = useCallback(async () => {
    if (!stripe || !elements) {
      setPaymentMethodId(null);
      return;
    }
    const card =
      cardElementRef.current || elements.getElement(CardElement);
    if (!card) {
      setPaymentMethodId(null);
      return;
    }
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });
    if (error || !paymentMethod?.id) {
      setPaymentMethodId(null);
      return;
    }
    setPaymentMethodId(paymentMethod.id);
  }, [stripe, elements]);

  const handleCardChange = useCallback(
    async (e: StripeCardElementChangeEvent) => {
      setIsCardComplete(e.complete);
      setPaymentError(e.error?.message ?? null);
      if (e.complete) {
        setIsChangingCard(false);
        await persistCardPaymentMethod();
      } else {
        setPaymentMethodId(null);
      }
    },
    [persistCardPaymentMethod],
  );

  const confirmPaymentWithCard = async (
    clientSecret: string,
  ): Promise<{
    success: boolean;
    error?: string;
    requiresAction?: boolean;
  }> => {
    if (!stripe) {
      return { success: false, error: "Payment system not ready" };
    }

    const cardElement =
      cardElementRef.current || elements?.getElement(CardElement);
    const paymentMethod =
      paymentMethodId != null
        ? paymentMethodId
        : cardElement
          ? { card: cardElement }
          : null;

    if (!paymentMethod) {
      return {
        success: false,
        error: "Card input not found. Please re-enter your card details.",
      };
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: paymentMethod },
    );

    if (error) {
      if (
        error.code === "authentication_required" ||
        error.decline_code === "authentication_required" ||
        error.payment_intent?.status === "requires_action"
      ) {
        return {
          success: false,
          error:
            error.message ||
            "Additional authentication required. Please complete verification.",
          requiresAction: true,
        };
      }
      if (error.type === "card_error" || error.type === "validation_error") {
        return { success: false, error: error.message || "Card declined" };
      }
      return { success: false, error: error.message || "Payment failed" };
    }

    if (!paymentIntent) {
      return { success: false, error: "No payment response received" };
    }

    switch (paymentIntent.status) {
      case "succeeded":
      case "processing":
        return { success: true };
      case "requires_action":
        return {
          success: false,
          error: "Additional authentication required. Please try again.",
          requiresAction: true,
        };
      case "requires_payment_method":
        return {
          success: false,
          error: "Payment declined. Please try a different card.",
        };
      case "canceled":
        return { success: false, error: "Payment was cancelled" };
      default:
        return {
          success: false,
          error: `Unexpected payment status: ${paymentIntent.status}`,
        };
    }
  };

  const finalizeAcceptedPayment = async (
    paymentId: string,
    buildBidResult: (
      bidStatus: BidStatus,
      extras?: Partial<BidResultState>,
    ) => BidResultState,
  ) => {
    try {
      await confirmPayment.mutateAsync({ id: paymentId });
    } catch {
      /* Stripe succeeded; webhook may finalize */
    }
    setBidResult(
      buildBidResult(BidStatus.ACCEPTED, { paymentComplete: true }),
    );
    setStripeCompletion(null);
    await queryClient.invalidateQueries({ queryKey: ["bids", "place", placeId] });
    toast.custom(
      () => (
        <div className="bg-bg border border-line rounded-xl p-4 shadow-lg min-w-[320px]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full border-2 border-success flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <div>
              <h3 className="font-bold text-fg text-lg">Bid Accepted!</h3>
              <p className="text-success text-sm">
                You&apos;re booked at your price.
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 5000 },
    );
  };

  const formik = useFormik({
    initialValues: {
      checkInDate: savedFormState?.checkInDate,
      checkOutDate: savedFormState?.checkOutDate,
      bidPerNight: savedFormState?.bidPerNight ?? "",
    },
    validationSchema: bidValidationSchema,
    onSubmit: async (values) => {
      setPaymentError(null);

      if (isAuthenticated && !acceptedTerms) {
        setPaymentError(
          "Please agree to the Terms of Use, Privacy Policy, and cancellation terms.",
        );
        return;
      }

      setIsProcessing(true);

      if (
        isAuthenticated &&
        (!isCardComplete || !paymentMethodId || !stripe || !elements)
      ) {
        setPaymentError("Please enter valid card details");
        setIsProcessing(false);
        setLockInOpen(false);
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
        const totalNightsForResult =
          result.bid?.totalNights ??
          Math.max(
            1,
            differenceInDays(values.checkOutDate!, values.checkInDate!),
          );
        const bidPerNightForResult =
          result.bid?.bidPerNight ?? Number(values.bidPerNight);
        const buildBidResult = (
          bidStatus: BidStatus,
          extras?: Partial<BidResultState>,
        ): BidResultState => ({
          bidStatus,
          message: result.message,
          totalAmount:
            result.bid?.totalAmount ?? bidPerNightForResult * totalNightsForResult,
          totalNights: totalNightsForResult,
          bidId: result.bid?.id,
          ...extras,
        });

        if (result.status === BidStatus.ACCEPTED && result.bid) {
          const paymentResult = await createPaymentIntent.mutateAsync({
            bidId: result.bid.id,
          });

          if (paymentResult.clientSecret) {
            setPaymentId(paymentResult.payment.id);
            const confirmResult = await confirmPaymentWithCard(
              paymentResult.clientSecret,
            );

            if (confirmResult.success) {
              await finalizeAcceptedPayment(
                paymentResult.payment.id,
                buildBidResult,
              );
            } else if (isStripeActionRequired(confirmResult)) {
              setStripeCompletion({
                clientSecret: paymentResult.clientSecret,
                paymentId: paymentResult.payment.id,
                totalAmount:
                  result.bid.totalAmount ??
                  bidPerNightForResult * totalNightsForResult,
                bidId: result.bid.id,
              });
            } else {
              setPaymentError(confirmResult.error || "Payment failed");
              await queryClient.invalidateQueries({
                queryKey: ["bids", "place", placeId],
              });
            }
          } else {
            setPaymentError(
              "Something went wrong with payment processing. Please contact support.",
            );
          }
        } else if (result.status === BidStatus.REJECTED) {
          setBidResult(buildBidResult(BidStatus.REJECTED));
          toast.custom(
            () => (
              <div className="bg-bg border border-line rounded-xl p-4 shadow-lg min-w-[320px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full border-2 border-danger flex items-center justify-center">
                    <XCircle className="w-7 h-7 text-danger" />
                  </div>
                  <div>
                    <h3 className="font-bold text-fg text-lg">Too Low</h3>
                    <p className="text-danger text-sm">No charge.</p>
                  </div>
                </div>
                <div className="border-t border-line pt-3">
                  <div className="flex items-center gap-2 text-warning">
                    <RefreshCw className="w-4 h-4" />
                    <p className="text-muted text-sm">
                      Raise your bid or try new dates.
                    </p>
                  </div>
                </div>
              </div>
            ),
            { duration: 5000 },
          );
          setIsProcessing(false);
        } else {
          // PENDING status — no terminal outcome panel
          toast.info("Bid submitted! Awaiting review.");
          setIsProcessing(false);
        }

        trackEvent(ANALYTICS_EVENTS.BID_SUBMITTED, {
          place_id: placeId,
          status: result.status,
        });
        if (result.status === BidStatus.ACCEPTED) {
          trackEvent(ANALYTICS_EVENTS.ACCEPTED_BID, { place_id: placeId });
        } else if (result.status === BidStatus.REJECTED) {
          trackEvent(ANALYTICS_EVENTS.REJECTED_BID, { place_id: placeId });
        }
      } catch (error: any) {
        console.error("Bid submission error:", error);
        if (isLowBidRejection(error)) {
          const nights = Math.max(
            1,
            differenceInDays(values.checkOutDate!, values.checkInDate!),
          );
          const perNight = Number(values.bidPerNight);
          setBidResult({
            bidStatus: BidStatus.REJECTED,
            message: error.message,
            totalAmount: perNight * nights,
            totalNights: nights,
          });
          trackEvent(ANALYTICS_EVENTS.REJECTED_BID, { place_id: placeId });
        } else {
          setPaymentError(error.message || "Failed to submit bid");
        }
        setIsProcessing(false);
      } finally {
        setLockInOpen(false);
      }
    },
  });

  // Notify parent of restored check-in date on mount (for inventory check)
  useEffect(() => {
    const checkIn = savedFormState?.checkInDate;
    const checkOut = savedFormState?.checkOutDate;
    if (checkIn && onDateChange) {
      onDateChange(checkIn.toISOString().split("T")[0]);
    }
    if (onBookingDatesChange && checkIn && checkOut) {
      onBookingDatesChange(checkIn, checkOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  useEffect(() => {
    if (!onBookingDatesChange) return;
    onBookingDatesChange(
      formik.values.checkInDate,
      formik.values.checkOutDate,
    );
  }, [formik.values.checkInDate, formik.values.checkOutDate, onBookingDatesChange]);

  useEffect(() => {
    if (!isListing) return;
    const id = setInterval(
      () => setAuctionSeconds(getSecondsUntilMidnight()),
      1000,
    );
    return () => clearInterval(id);
  }, [isListing]);

  // Clear localStorage when bid is successfully submitted
  useEffect(() => {
    if (bidResult) {
      clearBidFormStorage();
    }
  }, [bidResult]);

  // Clear localStorage when user becomes authenticated and has existing bid
  useEffect(() => {
    if (isAuthenticated && existingBidData?.bid) {
      clearBidFormStorage();
    }
  }, [isAuthenticated, existingBidData]);

  const isDateBlocked =
    (field: "checkInDate" | "checkOutDate") => (date: Date) => {
      // Basic date range validation
      if (isBefore(date, today) || isAfter(date, maxDate)) {
        return true;
      }

      // Prevent selecting the same date for both fields
      if (formik.values[field] && isSameDay(date, formik.values[field])) {
        return true;
      }

      // For check-in: disable dates on or after the selected check-out
      if (field === "checkInDate" && formik.values.checkOutDate) {
        if (!isBefore(date, formik.values.checkOutDate)) {
          return true;
        }
      }

      // For check-out: disable dates on or before the selected check-in
      if (field === "checkOutDate" && formik.values.checkInDate) {
        if (!isAfter(date, formik.values.checkInDate)) {
          return true;
        }
      }

      // Check if day of week is allowed
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      if (
        place?.allowedDaysOfWeek &&
        !place.allowedDaysOfWeek.includes(dayOfWeek)
      ) {
        return true;
      }

      if (place?.blackoutDates) {
        const dateStr = format(date, "yyyy-MM-dd");
        return place.blackoutDates.includes(dateStr);
      }
      return false;
    };

  // Check if any date in the selected range is blocked (blackout or not allowed day)
  const getBlockedDatesInRange = () => {
    if (!formik.values.checkInDate || !formik.values.checkOutDate) {
      return [];
    }

    const datesInRange = eachDayOfInterval({
      start: formik.values.checkInDate,
      end: formik.values.checkOutDate,
    });

    return datesInRange.filter((date) => {
      // Check blackout dates
      if (place?.blackoutDates) {
        const dateStr = format(date, "yyyy-MM-dd");
        if (place.blackoutDates.includes(dateStr)) {
          return true;
        }
      }
      // Check allowed days of week
      const dayOfWeek = date.getDay();
      if (
        place?.allowedDaysOfWeek &&
        !place.allowedDaysOfWeek.includes(dayOfWeek)
      ) {
        return true;
      }
      return false;
    });
  };

  const blockedDatesInRange = getBlockedDatesInRange();

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
    setPaymentMethodId(null);
    setStripeCompletion(null);
    setAcceptedTerms(false);
    setLockInOpen(false);
    setBidStep("dates");
    formik.resetForm();
  };

  const handleReviewBindingBid = () => {
    setPaymentError(null);
    if (!canProceedFromDates) {
      setPaymentError("Select valid check-in and check-out dates.");
      return;
    }
    if (!canProceedFromAmount) {
      setPaymentError("Enter your bid amount.");
      return;
    }
    if (!isAuthenticated) {
      saveBidFormToStorage(placeId, formik.values);
      navigate(ROUTES.SIGNUP, {
        state: { returnUrl: location.pathname },
      });
      return;
    }
    if (!acceptedTerms) {
      setPaymentError(
        "Please agree to the Terms of Use, Privacy Policy, and cancellation terms.",
      );
      return;
    }
    if (!isCardComplete || !paymentMethodId || !stripe || !elements) {
      setPaymentError("Please enter valid card details.");
      return;
    }
    setLockInOpen(true);
  };

  const handleLockInConfirm = () => {
    formik.submitForm();
  };

  const handleLoggedOutListingSubmit = () => {
    setPaymentError(null);
    if (!canProceedFromDates) {
      setPaymentError("Select valid check-in and check-out dates.");
      return;
    }
    if (!canProceedFromAmount) {
      setPaymentError("Enter your bid amount.");
      return;
    }
    saveBidFormToStorage(placeId, formik.values);
    navigate(ROUTES.SIGNUP, {
      state: { returnUrl: location.pathname },
    });
  };

  const handleRebid = async (newBidPerNight: number) => {
    setIsRebidding(true);
    try {
      await formik.setFieldValue("bidPerNight", String(newBidPerNight));
      setBidResult(null);
      setPaymentId(null);
      await formik.submitForm();
    } finally {
      setIsRebidding(false);
    }
  };

  const stepIndex = STEPS.indexOf(bidStep);

  const canProceedFromDates =
    formik.values.checkInDate &&
    formik.values.checkOutDate &&
    blockedDatesInRange.length === 0 &&
    !isInventoryExhausted;

  const canProceedFromAmount =
    formik.values.bidPerNight && Number(formik.values.bidPerNight) > 0;

  const goNext = () => {
    if (bidStep === "dates" && canProceedFromDates) setBidStep("amount");
    else if (bidStep === "amount" && canProceedFromAmount) setBidStep("review");
    else if (bidStep === "review") {
      if (!isAuthenticated) {
        saveBidFormToStorage(placeId, formik.values);
        navigate(ROUTES.SIGNUP, {
          state: { returnUrl: location.pathname },
        });
      } else {
        setBidStep("payment");
      }
    }
  };

  const goBack = () => {
    const i = STEPS.indexOf(bidStep);
    if (i > 0) setBidStep(STEPS[i - 1]);
  };

  const savingsPercent =
    place.retailPrice && Number(formik.values.bidPerNight) > 0
      ? Math.max(
          0,
          Math.round(
            (1 - Number(formik.values.bidPerNight) / place.retailPrice) * 100,
          ),
        )
      : 0;

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

  const showOutcomePanel =
    bidResult &&
    formik.values.checkInDate &&
    formik.values.checkOutDate &&
    (shouldShowRejectedOutcome(bidResult.bidStatus) ||
      shouldShowConfirmedOutcome(
        bidResult.bidStatus,
        undefined,
        bidResult.paymentComplete,
      ));

  if (showOutcomePanel) {
    const panelStatus = shouldShowRejectedOutcome(bidResult!.bidStatus)
      ? BidStatus.REJECTED
      : BidStatus.ACCEPTED;
    return (
      <BidOutcomePanel
        status={panelStatus}
        place={place}
        checkIn={formik.values.checkInDate!}
        checkOut={formik.values.checkOutDate!}
        bidPerNight={Number(formik.values.bidPerNight)}
        totalAmount={bidResult!.totalAmount ?? calculateTotalAmount()}
        onTryAgain={handleTryAgain}
        onTryNewDates={handleTryAgain}
        onRebid={isAuthenticated ? handleRebid : undefined}
        isRebidding={isRebidding}
      />
    );
  }

  // If user has existing bid for this place (only when no active session outcome)
  const existingBid = existingBidData?.bid;
  const isPastBid =
    existingBid && new Date(existingBid.checkOutDate) < today;

  const handleStripeCompletionSuccess = async () => {
    if (!stripeCompletion) return;
    await finalizeAcceptedPayment(
      stripeCompletion.paymentId,
      (_status, extras) => ({
        bidStatus: BidStatus.ACCEPTED,
        paymentComplete: extras?.paymentComplete,
        totalAmount: stripeCompletion.totalAmount,
        totalNights: Math.max(1, calculateTotalNights()),
        bidId: stripeCompletion.bidId,
      }),
    );
  };

  if (existingBid && !isProcessing && !isPastBid && !bidResult && !stripeCompletion) {
    if (
      shouldShowConfirmedOutcome(
        existingBid.status,
        existingBid.payment?.status,
      )
    ) {
      return (
        <BidOutcomePanel
          status={BidStatus.ACCEPTED}
          place={place}
          checkIn={new Date(existingBid.checkInDate)}
          checkOut={new Date(existingBid.checkOutDate)}
          bidPerNight={existingBid.bidPerNight}
          totalAmount={existingBid.totalAmount}
          onTryAgain={handleTryAgain}
          onTryNewDates={handleTryAgain}
          onRebid={isAuthenticated ? handleRebid : undefined}
          isRebidding={isRebidding}
        />
      );
    }
    if (shouldShowRejectedOutcome(existingBid.status)) {
      return (
        <BidOutcomePanel
          status={BidStatus.REJECTED}
          place={place}
          checkIn={new Date(existingBid.checkInDate)}
          checkOut={new Date(existingBid.checkOutDate)}
          bidPerNight={existingBid.bidPerNight}
          totalAmount={existingBid.totalAmount}
          onTryAgain={handleTryAgain}
          onTryNewDates={handleTryAgain}
          onRebid={isAuthenticated ? handleRebid : undefined}
          isRebidding={isRebidding}
        />
      );
    }
    return <ExistingBidCard bid={existingBid} place={place} />;
  }

  if (isListing) {
    const nights = calculateTotalNights();
    const totalAmount = calculateTotalAmount();

    if (stripeCompletion) {
      return (
        <div className="listing-bid-sidebar space-y-4 lg:sticky lg:top-24">
          <ListingBidPanelHeader />
          <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <p className="text-sm font-medium text-fg">
              Verify with your bank
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Your bid was accepted. Complete the bank verification below — no
              second checkout step unless your bank requires it.
            </p>
            <BidPaymentElement
              clientSecret={stripeCompletion.clientSecret}
              paymentId={stripeCompletion.paymentId}
              amount={stripeCompletion.totalAmount}
              onSuccess={handleStripeCompletionSuccess}
              onError={(msg) => setPaymentError(msg)}
              submitClassName="w-full listing-cta-gradient h-12 text-base uppercase tracking-wider"
              submitLabel="Verify payment"
              autoConfirm
            />
          </div>
          {paymentError && (
            <p className="text-xs text-urgent">{paymentError}</p>
          )}
        </div>
      );
    }

    return (
      <>
        <BidLockInModal
          open={lockInOpen}
          onOpenChange={setLockInOpen}
          place={place}
          checkIn={formik.values.checkInDate}
          checkOut={formik.values.checkOutDate}
          totalAmount={totalAmount}
          auctionSeconds={auctionSeconds}
          onConfirm={handleLockInConfirm}
          onGoBack={() => setLockInOpen(false)}
          isSubmitting={isProcessing}
        />
        <div className="listing-bid-sidebar space-y-4 lg:sticky lg:top-24">
          <ListingBidPanelHeader />
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="listing-dates-box">
              <div className="listing-dates-box__col">
                <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase mb-1.5 block">
                  Check-in
                </Label>
                <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "listing-date-field w-full justify-between text-left font-normal text-fg",
                        !formik.values.checkInDate && "text-muted",
                      )}
                    >
                      {formik.values.checkInDate
                        ? format(formik.values.checkInDate, "EEE, MMM d, yyyy")
                        : "Select date"}
                      <CalendarIcon className="h-4 w-4 text-fg shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-bg border-line" align="start">
                    <Calendar
                      mode="single"
                      selected={formik.values.checkInDate}
                      onSelect={(date) => {
                        formik.setFieldValue("checkInDate", date);
                        setCheckInOpen(false);
                        if (date && onDateChange) {
                          onDateChange(date.toISOString().split("T")[0]);
                        }
                      }}
                      disabled={isDateBlocked("checkInDate")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="listing-dates-box__col">
                <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase mb-1.5 block">
                  Check-out
                </Label>
                <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "listing-date-field w-full justify-between text-left font-normal text-fg",
                        !formik.values.checkOutDate && "text-muted",
                      )}
                    >
                      {formik.values.checkOutDate
                        ? format(formik.values.checkOutDate, "EEE, MMM d, yyyy")
                        : "Select date"}
                      <CalendarIcon className="h-4 w-4 text-fg shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-bg border-line" align="start">
                    <Calendar
                      mode="single"
                      selected={formik.values.checkOutDate}
                      onSelect={(date) => {
                        formik.setFieldValue("checkOutDate", date);
                        setCheckOutOpen(false);
                      }}
                      disabled={isDateBlocked("checkOutDate")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label className="listing-bid-amount-label mb-2 block">
                <span className="text-fg">Your bid </span>
                <span className="text-muted">(USD)</span>
              </Label>
              <div className="listing-bid-amount-box relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold text-2xl font-medium pointer-events-none">
                  $
                </span>
                <Input
                  id="bidPerNightListing"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  className="w-full"
                  {...formik.getFieldProps("bidPerNight")}
                />
              </div>
              {!isAuthenticated && (
                <div className="listing-budget-copy mt-3 space-y-1">
                  <p className="text-sm font-medium text-fg">Enter your Budget</p>
                  <p className="listing-budget-hint text-muted leading-relaxed">
                    If that amount meets the hotel&apos;s base price for this date,
                    you win the room!
                  </p>
                </div>
              )}
            </div>
            {isAuthenticated ? (
            <>
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                Pay with
              </Label>
              {isCardComplete && !isChangingCard && (
                <div className="listing-pay-card flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-fg">
                    <CreditCard className="h-4 w-4 text-muted" />
                    <span>Payment method saved</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-gold hover:underline"
                    onClick={() => {
                      setIsChangingCard(true);
                      setIsCardComplete(false);
                      setPaymentMethodId(null);
                      setPaymentError(null);
                    }}
                  >
                    Update card
                  </button>
                </div>
              )}
              <div
                className={cn(
                  "border border-line rounded-lg p-3 bg-bg",
                  isCardComplete &&
                    !isChangingCard &&
                    "sr-only h-px overflow-hidden opacity-0 pointer-events-none p-0 border-0",
                )}
                aria-hidden={isCardComplete && !isChangingCard}
              >
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#f8fafc",
                        fontFamily: "Inter, system-ui, sans-serif",
                        "::placeholder": { color: "#64748b" },
                      },
                      invalid: { color: "#ef4444", iconColor: "#ef4444" },
                    },
                  }}
                  onReady={(element) => {
                    cardElementRef.current = element;
                  }}
                  onChange={handleCardChange}
                />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Charged only if your bid is accepted when you confirm after the
                lock-in timer.
              </p>
            </div>
            {nights > 0 && formik.values.checkInDate && formik.values.checkOutDate && (
              <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-muted">
                <p className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gold" />
                  {format(formik.values.checkInDate, "MMM d")} →{" "}
                  {format(formik.values.checkOutDate, "MMM d, yyyy")}
                </p>
                <p className="flex items-center gap-2 mt-1">
                  <Moon className="h-4 w-4 text-gold" />
                  {nights} night{nights !== 1 ? "s" : ""}
                </p>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold"
              />
              <span className="text-xs text-muted leading-relaxed">
                I agree to the{" "}
                <Link to={ROUTES.TERMS} className="text-gold underline" target="_blank">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link to={ROUTES.PRIVACY} className="text-gold underline" target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {paymentError && <p className="text-xs text-urgent">{paymentError}</p>}
            {isInventoryExhausted && formik.values.checkInDate && (
              <p className="text-xs text-urgent">
                No availability for selected date. Try different dates.
              </p>
            )}
            <Button
              type="button"
              className="w-full listing-cta-gradient h-12 text-base uppercase tracking-wider"
              onClick={handleReviewBindingBid}
              disabled={isProcessing || isInventoryExhausted}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              LOCK IN BID
            </Button>
            <div className="listing-lock-hint">
              <p className="flex items-start gap-2 text-xs text-muted leading-relaxed text-left">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-fg" />
                Once you click LOCK IN, you can still go back until the timer hits
                zero.
              </p>
            </div>
            </>
            ) : (
              <>
                {paymentError && <p className="text-xs text-urgent">{paymentError}</p>}
                {isInventoryExhausted && formik.values.checkInDate && (
                  <p className="text-xs text-urgent">
                    No availability for selected date. Try different dates.
                  </p>
                )}
                <Button
                  type="button"
                  className="w-full listing-cta-gradient h-12 text-base uppercase tracking-wider"
                  onClick={handleLoggedOutListingSubmit}
                  disabled={isInventoryExhausted}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Verify .edu &amp; Submit Bid
                </Button>
                <p className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                  <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-fg" />
                  Once you place your bid, you will need to verify your student
                  status, and enter your credit card details. Your card will not
                  be charged at this time.
                </p>
              </>
            )}
          </form>
        </div>
      </>
    );
  }

  // Bid form
  return (
    <div className="space-y-4 gold-card p-4 md:p-5">
      <div className="flex flex-col gap-3">
        <BidCountdown className="w-full justify-center" />
        <BidStepIndicator current={bidStep} />
      </div>

      <div className="rounded-lg border border-gold/25 bg-gold/5 px-3 py-2 text-center">
        <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
          Retail rate
        </p>
        <p className="retail-anchor-value">{formatCurrency(place.retailPrice)}</p>
        <p className="text-xs text-muted">/ night · anchor price</p>
      </div>

      {isPastBid && existingBid && (
        <div className="glass rounded-lg p-3 border border-line text-sm">
          <p className="text-muted">
            You stayed here{" "}
            <span className="text-fg font-medium">
              {format(new Date(existingBid.checkInDate), "MMM d")}–
              {format(new Date(existingBid.checkOutDate), "MMM d, yyyy")}
            </span>{" "}
            for{" "}
            <span className="text-fg font-medium">
              ${existingBid.bidPerNight}/night
            </span>
            . Bid again for a new stay.
          </p>
        </div>
      )}
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        {bidStep === "dates" && (
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
                    // Notify parent of date change for inventory checking
                    if (date && onDateChange) {
                      onDateChange(date.toISOString().split("T")[0]);
                    }
                  }}
                  disabled={isDateBlocked("checkInDate")}
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
                  disabled={isDateBlocked("checkOutDate")}
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
        )}

        {bidStep === "amount" && (
          <div className="space-y-3">
            <Label className="text-sm text-muted mb-1.5 block">
              Your bid per night
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold" />
              <Input
                id="bidPerNight"
                type="number"
                min="1"
                step="0.01"
                className="pl-9 h-11 bg-glass border-gold/30 text-fg placeholder:text-muted"
                {...formik.getFieldProps("bidPerNight")}
              />
            </div>
            {formik.touched.bidPerNight && formik.errors.bidPerNight && (
              <p className="text-xs text-danger mt-1">
                {formik.errors.bidPerNight}
              </p>
            )}
            {savingsPercent > 0 && (
              <p className="text-sm text-success">
                {savingsPercent}% below retail · binding if accepted
              </p>
            )}
          </div>
        )}

        {bidStep === "review" && (
          <div className="gold-border rounded-lg p-4 space-y-3 text-sm">
            <h4 className="font-semibold text-gold-light">Review your bid</h4>
            <div className="flex justify-between text-muted">
              <span>Dates</span>
              <span className="text-fg font-medium">
                {formik.values.checkInDate &&
                  format(formik.values.checkInDate, "MMM d")}{" "}
                –{" "}
                {formik.values.checkOutDate &&
                  format(formik.values.checkOutDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Retail rate</span>
              <span className="retail-anchor">
                {formatCurrency(place.retailPrice)}/night
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Your bid</span>
              <span className="text-gold font-semibold">
                {formatCurrency(Number(formik.values.bidPerNight))}/night
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <span className="text-fg font-medium">Total if accepted</span>
              <span className="text-fg font-bold text-lg">
                {formatCurrency(calculateTotalAmount())}
              </span>
            </div>
            <p className="text-xs text-warning border border-warning/30 rounded-md p-2 bg-warning/5">
              Binding bid: if accepted, your card is charged immediately for the
              full amount. Rejected bids are not charged.
            </p>
          </div>
        )}

        {bidStep === "payment" && isAuthenticated && (
          <>
            <div className="space-y-2">
              <Label className="text-sm text-muted mb-1.5 block">Card details</Label>
              <div className="border border-gold/30 rounded-lg p-3 bg-glass">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#f8fafc",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        "::placeholder": { color: "#64748b" },
                      },
                      invalid: { color: "#ef4444", iconColor: "#ef4444" },
                    },
                  }}
                  onReady={(element) => {
                    cardElementRef.current = element;
                  }}
                  onChange={handleCardChange}
                />
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold"
              />
              <span className="text-xs text-muted leading-relaxed">
                I agree to the{" "}
                <Link to={ROUTES.TERMS} className="text-gold underline" target="_blank">Terms of Use</Link>
                ,{" "}
                <Link to={ROUTES.PRIVACY} className="text-gold underline" target="_blank">Privacy Policy</Link>
                , and cancellation terms. If my bid is accepted, my card will be charged immediately.
              </span>
            </label>
          </>
        )}

        {blockedDatesInRange.length > 0 && bidStep === "dates" && (
          <div className="glass rounded-lg p-3 border border-warning/50">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-warning font-medium">
                  Selected dates include unavailable dates
                </p>
                <p className="text-muted text-xs mt-1">
                  The following dates are blocked:{" "}
                  {blockedDatesInRange
                    .map((d) => format(d, "MMM d"))
                    .join(", ")}
                </p>
              </div>
            </div>
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

        {/* Inventory Exhausted Warning */}
        {isInventoryExhausted && formik.values.checkInDate && (
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-danger" />
              <p className="text-sm text-danger font-medium">
                No availability for selected date. Please try a different date.
              </p>
            </div>
          </div>
        )}

        {bidStep !== "payment" ? (
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-line"
                onClick={goBack}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 btn-bid-premium"
              onClick={goNext}
              disabled={
                (bidStep === "dates" && !canProceedFromDates) ||
                (bidStep === "amount" && !canProceedFromAmount)
              }
            >
              {bidStep === "review"
                ? isAuthenticated
                  ? "Continue to payment"
                  : "Verify .edu to bid"
                : "Continue"}
            </Button>
          </div>
        ) : isAuthenticated ? (
          <Button
            type="submit"
            className="w-full btn-bid-premium h-12 text-base uppercase tracking-wider"
            disabled={
              isProcessing ||
              createBid.isPending ||
              !stripe ||
              !elements ||
              !isCardComplete ||
              !paymentMethodId ||
              !acceptedTerms ||
              isInventoryExhausted
            }
          >
            {isProcessing ? "Processing…" : "Place binding bid"}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full btn-bid-premium h-12 text-base uppercase tracking-wider"
            onClick={() => {
              saveBidFormToStorage(placeId, formik.values);
              navigate(ROUTES.SIGNUP, {
                state: { returnUrl: location.pathname },
              });
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Verify .edu to continue
          </Button>
        )}

        <p className="text-xs text-center text-muted">
          {bidStep === "payment" && isAuthenticated
            ? "Secure checkout via Stripe. Charged immediately if your bid is accepted."
            : "Student verification required to place a bid."}
        </p>
      </form>
    </div>
  );
}

// Exported component that wraps the form with Elements provider
export function BidForm({
  place,
  placeId,
  onDateChange,
  onBookingDatesChange,
  isInventoryExhausted,
  variant = "default",
}: BidFormProps) {
  if (!stripePromise) {
    return (
      <div className="text-center py-4 text-muted">
        Payment system not available
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <BidFormInner
        place={place}
        placeId={placeId}
        onDateChange={onDateChange}
        onBookingDatesChange={onBookingDatesChange}
        isInventoryExhausted={isInventoryExhausted}
        variant={variant}
      />
    </Elements>
  );
}

/** One-shot retry when bid is accepted but Stripe confirm failed (DB PENDING only). */
function OrphanBidPaymentRetry({
  bid,
  onSuccess,
  onError,
}: {
  bid: Bid;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const createPaymentIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();
  const [isRetrying, setIsRetrying] = useState(false);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!stripe || !paymentMethodId) {
      onError("Please enter valid card details.");
      return;
    }
    setIsRetrying(true);
    try {
      const paymentResult = await createPaymentIntent.mutateAsync({
        bidId: bid.id,
      });
      if (!paymentResult.clientSecret) {
        throw new Error("Payment could not be started.");
      }
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentResult.clientSecret,
        { payment_method: paymentMethodId },
      );
      if (error) {
        throw new Error(error.message || "Payment failed");
      }
      if (
        !paymentIntent ||
        (paymentIntent.status !== "succeeded" &&
          paymentIntent.status !== "processing")
      ) {
        throw new Error("Payment was not completed.");
      }
      await confirmPayment.mutateAsync({ id: paymentResult.payment.id });
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Payment failed. Try again.";
      onError(message);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="border border-line rounded-lg p-3 bg-bg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#f8fafc",
                fontFamily: "Inter, system-ui, sans-serif",
                "::placeholder": { color: "#64748b" },
              },
            },
          }}
          onReady={(el) => {
            cardRef.current = el;
          }}
          onChange={async (e) => {
            if (!e.complete || !stripe) {
              setPaymentMethodId(null);
              return;
            }
            const card = cardRef.current || elements?.getElement(CardElement);
            if (!card) return;
            const { error, paymentMethod } = await stripe.createPaymentMethod({
              type: "card",
              card,
            });
            setPaymentMethodId(
              error || !paymentMethod?.id ? null : paymentMethod.id,
            );
          }}
        />
      </div>
      <Button
        type="button"
        className="w-full listing-cta-gradient h-12 text-base uppercase tracking-wider"
        onClick={handleRetry}
        disabled={isRetrying || !paymentMethodId}
      >
        {isRetrying ? "Processing…" : "Retry payment"}
      </Button>
    </div>
  );
}

// Existing bid: PENDING review, ACCEPTED awaiting payment, or REQUIRES_ACTION (not confirmed panel)
function ExistingBidCard({ bid, place }: { bid: Bid; place: Place }) {
  const navigate = useNavigate();
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);
  const payment = bid.payment;
  const paymentStatus = payment?.status;
  const isConfirmed =
    paymentJustCompleted ||
    shouldShowConfirmedOutcome(bid.status, paymentStatus);

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
      label: "Payment Expired",
      icon: Clock,
    },
  };

  const showStripeCompletion = shouldShowStripeCompletionUI(paymentStatus);
  const showOrphanPaymentRetry =
    bid.status === BidStatus.ACCEPTED &&
    !isConfirmed &&
    isDbPaymentAwaitingCapture(paymentStatus);
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
      description: showStripeCompletion
        ? "Complete card verification to secure your reservation."
        : showOrphanPaymentRetry
          ? "Your bid was accepted. Retry payment once below."
          : "Your reservation is being confirmed.",
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
  const paymentConfig =
    paymentStatus && !isDbPaymentAwaitingCapture(paymentStatus)
      ? paymentStatusConfig[paymentStatus]
      : null;

  if (isConfirmed) {
    return (
      <BidOutcomePanel
        status={BidStatus.ACCEPTED}
        place={place}
        checkIn={new Date(bid.checkInDate)}
        checkOut={new Date(bid.checkOutDate)}
        bidPerNight={bid.bidPerNight}
        totalAmount={bid.totalAmount}
        onTryAgain={() => navigate(ROUTES.HOME)}
        onTryNewDates={() => navigate(ROUTES.HOME)}
      />
    );
  }

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

      {showStripeCompletion && (
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
            Bank verification
          </Label>
          <div className="border border-line rounded-lg p-3 bg-bg">
            <ExistingBidPaymentSection
              bid={bid}
              onSuccess={() => setPaymentJustCompleted(true)}
              submitClassName="w-full listing-cta-gradient h-12 text-base uppercase tracking-wider"
              autoConfirm
            />
          </div>
        </div>
      )}

      {showOrphanPaymentRetry && (
        <OrphanBidPaymentRetry
          bid={bid}
          onSuccess={() => setPaymentJustCompleted(true)}
          onError={(msg) => toast.error(msg)}
        />
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
