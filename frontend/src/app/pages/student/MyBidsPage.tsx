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
  PENDING: "bg-warning/20 text-warning",
  ACCEPTED: "bg-success/20 text-success",
  REJECTED: "bg-danger/20 text-danger",
  EXPIRED: "bg-muted/20 text-muted",
};

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
      <div className="min-h-screen bg-bg">
        <HomeHeader />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="min-h-screen bg-bg">
        <HomeHeader />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold text-fg mb-6">My Bids</h1>
          <Card className="bg-glass-2 border-line">
            <CardContent className="py-12 text-center">
              <p className="text-muted mb-4">
                You haven't placed any bids yet.
              </p>
              <Button asChild className="btn-bid">
                <Link to={ROUTES.HOME}>Browse Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-fg mb-6">My Bids</h1>

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
              <Card key={bid.id} className="bg-glass-2 border-line">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-fg">
                        {bid.place?.name || "Unknown Place"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-muted">
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
                      <DollarSign className="w-4 h-4 text-muted" />
                      <span className="text-fg">
                        <strong>Bid:</strong> {formatCurrency(bid.bidPerNight)}
                        /night
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted" />
                      <span className="text-fg">
                        <strong>Check-in:</strong>{" "}
                        {format(new Date(bid.checkInDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted" />
                      <span className="text-fg">
                        <strong>Check-out:</strong>{" "}
                        {format(new Date(bid.checkOutDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-muted">
                      <strong className="text-fg">Total:</strong>{" "}
                      {formatCurrency(bid.totalAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {/* Show checkout button if payment not made or failed */}
                    {canCheckout && (
                      <Button asChild size="sm" className="btn-bid">
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
                      <div className="flex items-center gap-2 text-sm text-brand glass px-3 py-1.5 rounded-md border border-brand/30">
                        <CheckCircle className="w-4 h-4" />
                        <span>Payment authorized - awaiting confirmation</span>
                      </div>
                    )}

                    {/* Payment captured - completed */}
                    {isPaymentCaptured && (
                      <div className="flex items-center gap-2 text-sm text-success glass px-3 py-1.5 rounded-md border border-success/30">
                        <CheckCircle className="w-4 h-4" />
                        <span>Payment complete - awaiting confirmation!</span>
                      </div>
                    )}

                    {/* Payment cancelled */}
                    {isPaymentCancelled && (
                      <div className="flex items-center gap-2 text-sm text-muted glass px-3 py-1.5 rounded-md border border-line">
                        <XCircle className="w-4 h-4" />
                        <span>Payment was cancelled</span>
                      </div>
                    )}

                    {bid.status === "REJECTED" && bid.rejectionReason && (
                      <span className="text-sm text-danger">
                        Rejection reason: {bid.rejectionReason}
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-line text-fg hover:bg-glass"
                    >
                      <Link
                        to={ROUTES.PUBLIC_PLACE_DETAIL.replace(
                          ":id",
                          bid.placeId,
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
