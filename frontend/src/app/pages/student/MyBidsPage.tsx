import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useMyBids } from "../../../hooks/useBids";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Loader2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { HomeHeader } from "../../components/home";

const bidStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
};

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

// Helper function to format currency
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export function MyBidsPage() {
  const { data, isLoading } = useMyBids();
  const bids = data?.bids || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-6">My Bids</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't placed any bids yet.
              </p>
              <Button asChild>
                <Link to={ROUTES.HOME}>Browse Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">My Bids</h1>

        <div className="grid gap-4">
          {bids.map((bid) => {
            const payment = bid.payment;
            const paymentStatus = payment?.status;
            const paymentConfig = paymentStatus
              ? paymentStatusConfig[paymentStatus]
            : null;

          // Determine what action button to show
          const canCheckout =
            bid.status === "ACCEPTED" &&
            (!payment ||
              paymentStatus === "PENDING" ||
              paymentStatus === "FAILED" ||
              paymentStatus === "EXPIRED");
          const isPaymentAuthorized = paymentStatus === "AUTHORIZED";
          const isPaymentCaptured = paymentStatus === "CAPTURED";
          const isPaymentCancelled = paymentStatus === "CANCELLED";

          return (
            <Card key={bid.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {bid.place?.name || "Unknown Place"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {bid.place?.city}, {bid.place?.country}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={bidStatusColors[bid.status] || ""}>
                      {bid.status}
                    </Badge>
                    {paymentConfig && (
                      <Badge className={paymentConfig.color}>
                        <paymentConfig.icon className="w-3 h-3 mr-1" />
                        {paymentConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>
                      <strong>Bid:</strong> {formatCurrency(bid.bidPerNight)}
                      /night
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      <strong>Check-in:</strong>{" "}
                      {format(new Date(bid.checkInDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      <strong>Check-out:</strong>{" "}
                      {format(new Date(bid.checkOutDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <strong>Total:</strong> {formatCurrency(bid.totalAmount)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {/* Show checkout button if payment not made or failed */}
                  {canCheckout && (
                    <Button asChild size="sm">
                      <Link
                        to={ROUTES.STUDENT_CHECKOUT.replace(":bidId", bid.id)}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        {paymentStatus === "FAILED" ||
                        paymentStatus === "EXPIRED"
                          ? "Retry Payment"
                          : "Proceed to Checkout"}
                      </Link>
                    </Button>
                  )}

                  {/* Payment authorized - awaiting capture */}
                  {isPaymentAuthorized && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                      <span>Payment authorized - awaiting confirmation</span>
                    </div>
                  )}

                  {/* Payment captured - completed */}
                  {isPaymentCaptured && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                      <span>Payment complete - booking confirmed!</span>
                    </div>
                  )}

                  {/* Payment cancelled */}
                  {isPaymentCancelled && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md">
                      <XCircle className="w-4 h-4" />
                      <span>Payment was cancelled</span>
                    </div>
                  )}

                  {bid.status === "REJECTED" && bid.rejectionReason && (
                    <span className="text-sm text-red-600">
                      Rejection reason: {bid.rejectionReason}
                    </span>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={ROUTES.PUBLIC_PLACE_DETAIL.replace(
                        ":id",
                        bid.placeId
                      )}
                    >
                      View Place
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>
    </div>
  );
}
