import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../../../lib/stripe";
import {
  usePaymentForBid,
  useCreatePaymentIntent,
  useConfirmPayment,
} from "../../../hooks/usePayments";
import { useBid } from "../../../hooks/useBids";
import { PaymentStatus } from "../../../types/payment.types";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BidStatus } from "../../../types/bid.types";
import { HomeHeader } from "../../components/home";

// Checkout form component (inside Elements provider)
function CheckoutForm({
  paymentId,
  onSuccess,
}: {
  paymentId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmPayment = useConfirmPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Confirm the payment with Stripe
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + ROUTES.STUDENT_MY_BIDS,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "An error occurred during payment");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "requires_capture") {
      // Payment authorized successfully - update our backend
      try {
        await confirmPayment.mutateAsync({ id: paymentId });
        toast.success("Payment authorized! Your funds are held.");
        onSuccess();
      } catch (err) {
        setErrorMessage("Payment authorized but failed to update status");
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
        size="lg"
      >
        {isProcessing ? (
          <>Processing...</>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Authorize Payment
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Your card will be authorized but not charged until your stay is
        confirmed.
      </p>
    </form>
  );
}

// Payment status display component
function PaymentStatusCard({
  status,
  payment,
}: {
  status: PaymentStatus;
  payment: any;
}) {
  const navigate = useNavigate();

  const statusConfig = {
    [PaymentStatus.AUTHORIZED]: {
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-500",
      title: "Payment Authorized",
      description:
        "Your payment has been authorized. Funds are held on your card.",
    },
    [PaymentStatus.CAPTURED]: {
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-500",
      title: "Payment Complete",
      description: "Your payment has been processed successfully.",
    },
    [PaymentStatus.PENDING]: {
      icon: Clock,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-500",
      title: "Payment Pending",
      description: "Please complete your payment below.",
    },
    [PaymentStatus.REQUIRES_ACTION]: {
      icon: AlertCircle,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-500",
      title: "Action Required",
      description: "Additional authentication is required.",
    },
    [PaymentStatus.FAILED]: {
      icon: XCircle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      borderColor: "border-red-500",
      title: "Payment Failed",
      description:
        payment?.failureReason || "Your payment could not be processed.",
    },
    [PaymentStatus.CANCELLED]: {
      icon: XCircle,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      borderColor: "border-gray-500",
      title: "Payment Cancelled",
      description: "This payment has been cancelled.",
    },
    [PaymentStatus.EXPIRED]: {
      icon: Clock,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      borderColor: "border-gray-500",
      title: "Authorization Expired",
      description: "The payment authorization has expired. Please try again.",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardContent className="p-8 text-center">
        <div
          className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          <Icon className={`h-12 w-12 ${config.iconColor}`} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
        <p className="text-muted-foreground mb-6">{config.description}</p>

        {(status === PaymentStatus.AUTHORIZED ||
          status === PaymentStatus.CAPTURED) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span>Amount:</span>
              <span className="font-semibold">
                ${payment?.amount?.toFixed(2)}
              </span>
            </div>
            {payment?.authorizedAt && (
              <div className="flex justify-between text-sm">
                <span>Authorized:</span>
                <span>
                  {format(new Date(payment.authorizedAt), "MMM dd, yyyy HH:mm")}
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => navigate(ROUTES.STUDENT_MY_BIDS)}
          className="w-full"
        >
          View My Bids
        </Button>
      </CardContent>
    </Card>
  );
}

// Main Checkout Page
export function CheckoutPage() {
  const navigate = useNavigate();
  const { bidId } = useParams<{ bidId: string }>();
  const [searchParams] = useSearchParams();

  const { data: bidData, isLoading: bidLoading } = useBid(bidId || "");
  const {
    data: paymentData,
    isLoading: paymentLoading,
    refetch: refetchPayment,
  } = usePaymentForBid(bidId || "");
  const createPaymentIntent = useCreatePaymentIntent();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const bid = bidData?.bid;
  const existingPayment = paymentData?.payment;

  // Initialize payment intent if needed
  useEffect(() => {
    if (!bidId || !bid || bid.status !== BidStatus.ACCEPTED) return;

    // If we have an existing payment with a client secret, use it
    if (
      existingPayment?.stripeClientSecret &&
      (existingPayment.status === PaymentStatus.PENDING ||
        existingPayment.status === PaymentStatus.REQUIRES_ACTION)
    ) {
      setClientSecret(existingPayment.stripeClientSecret);
      setPaymentId(existingPayment.id);
      return;
    }

    // If no payment or payment failed, create a new one
    if (!existingPayment || existingPayment.status === PaymentStatus.FAILED) {
      createPaymentIntent.mutate(
        { bidId },
        {
          onSuccess: (data) => {
            if (data.clientSecret) {
              setClientSecret(data.clientSecret);
              setPaymentId(data.payment.id);
            }
          },
        }
      );
    }
  }, [bidId, bid, existingPayment]);

  const handlePaymentSuccess = () => {
    refetchPayment();
  };

  // Loading state
  if (bidLoading || paymentLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <SkeletonLoader className="h-96" />
        </div>
      </div>
    );
  }

  // Bid not found
  if (!bid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Bid Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The bid you're looking for doesn't exist.
              </p>
              <Button onClick={() => navigate(ROUTES.HOME)}>
                Browse Places
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Bid not accepted yet
  if (bid.status !== BidStatus.ACCEPTED) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Bid Not Accepted</h2>
              <p className="text-muted-foreground mb-6">
                Your bid needs to be accepted before you can make a payment.
              </p>
              <Badge variant="outline" className="mb-4">
                Status: {bid.status}
              </Badge>
              <Button
                onClick={() => navigate(ROUTES.STUDENT_MY_BIDS)}
                className="w-full"
              >
                View My Bids
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show payment status if already processed
  if (
    existingPayment &&
    ![
      PaymentStatus.PENDING,
      PaymentStatus.REQUIRES_ACTION,
      PaymentStatus.FAILED,
    ].includes(existingPayment.status)
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <PaymentStatusCard
            status={existingPayment.status}
            payment={existingPayment}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Your booking details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bid.place && (
                <div className="flex gap-4">
                  {bid.place.images?.[0] && (
                    <img
                      src={bid.place.images[0].url}
                      alt={bid.place.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{bid.place.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {bid.place.city}, {bid.place.country}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
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
                  <span>Price Per Night:</span>
                  <span className="font-medium">${bid.bidPerNight}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>${bid.totalAmount}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your card will be authorized for $
                  {bid.totalAmount} but won't be charged until after your stay.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Enter your card information</CardDescription>
            </CardHeader>
            <CardContent>
              {!stripePromise ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Payment system is not configured. Please contact support.
                  </p>
                </div>
              ) : !clientSecret ? (
                <div className="text-center py-8">
                  <SkeletonLoader className="h-40" />
                  <p className="text-muted-foreground mt-4">
                    Initializing payment...
                  </p>
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#0f172a",
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    paymentId={paymentId!}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
