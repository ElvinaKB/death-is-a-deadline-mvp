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
        <div className="container mx-auto px-4 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-fg mb-4 sm:mb-6">
          My Bids
        </h1>

        <div className="grid gap-3 sm:gap-4">
          {bids.map((bid) => {
            const payment = bid.payment;
            const paymentStatus = payment?.status;
            const paymentConfig = paymentStatus
              ? paymentStatusConfig[paymentStatus]
              : null;

            const canCheckout =
              bid.status === "ACCEPTED" &&
              (!payment ||
                paymentStatus === "PENDING" ||
                paymentStatus === "FAILED" ||
                paymentStatus === "EXPIRED");
            const isPaymentCaptured = paymentStatus === "CAPTURED";
            const isPaymentCancelled = paymentStatus === "CANCELLED";

            return (
              <Card key={bid.id} className="bg-glass-2 border-line">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg text-fg truncate">
                        {bid.place?.name || "Unknown Place"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-muted text-xs sm:text-sm">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {bid.place?.city}, {bid.place?.country}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                      <Badge
                        className={`text-xs ${bidStatusColors[bid.status] || ""}`}
                      >
                        {bid.status}
                      </Badge>
                      {paymentConfig && (
                        <Badge className={`text-xs ${paymentConfig.color}`}>
                          <paymentConfig.icon className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">
                            {paymentConfig.label}
                          </span>
                          <span className="sm:hidden">
                            {paymentConfig.label.split(" ")[0]}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {/* Stats grid: 2 cols on mobile, 4 on desktop */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-muted shrink-0" />
                      <span className="text-fg text-xs sm:text-sm">
                        <strong>Bid:</strong> {formatCurrency(bid.bidPerNight)}
                        <span className="text-muted">/night</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted shrink-0" />
                      <span className="text-fg text-xs sm:text-sm">
                        <strong>In:</strong>{" "}
                        {format(new Date(bid.checkInDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted shrink-0" />
                      <span className="text-fg text-xs sm:text-sm">
                        <strong>Out:</strong>{" "}
                        {format(new Date(bid.checkOutDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <strong className="text-fg">Total:</strong>{" "}
                      <span className="text-fg">
                        {formatCurrency(bid.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {canCheckout && (
                      <Button
                        asChild
                        size="sm"
                        className="btn-bid h-8 text-xs sm:text-sm"
                      >
                        <Link
                          to={ROUTES.STUDENT_CHECKOUT.replace(":bidId", bid.id)}
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          {paymentStatus === "FAILED" ||
                          paymentStatus === "EXPIRED"
                            ? "Retry Payment"
                            : "Checkout"}
                        </Link>
                      </Button>
                    )}

                    {isPaymentCaptured && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-success glass px-2.5 py-1.5 rounded-md border border-success/30">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Booking confirmed!</span>
                      </div>
                    )}

                    {isPaymentCancelled && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted glass px-2.5 py-1.5 rounded-md border border-line">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Payment cancelled</span>
                      </div>
                    )}

                    {bid.status === "REJECTED" && bid.rejectionReason && (
                      <span className="text-xs sm:text-sm text-danger">
                        Rejected: {bid.rejectionReason}
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-line text-fg hover:bg-glass h-8 text-xs sm:text-sm ml-auto"
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
