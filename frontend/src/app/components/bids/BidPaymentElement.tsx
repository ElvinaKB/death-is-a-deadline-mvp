import { useCallback, useEffect, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CreditCard } from "lucide-react";
import { stripePromise } from "../../../lib/stripe";
import { stripeElementsAppearance } from "../../../config/stripeAppearance";
import {
  useConfirmPayment,
  useCreatePaymentIntent,
  usePaymentForBid,
} from "../../../hooks/usePayments";
import { Bid } from "../../../types/bid.types";
import { Payment, PaymentStatus } from "../../../types/payment.types";
import { Button } from "../ui/button";
import { ROUTES } from "../../../config/routes.config";
import { toast } from "sonner";

interface BidPaymentElementProps {
  clientSecret: string;
  paymentId: string;
  amount: number;
  onSuccess: (payment: Payment) => void;
  onError?: (message: string) => void;
  submitLabel?: string;
  submitClassName?: string;
  /** Start confirm as soon as Payment Element is ready (3DS / bank hold only). */
  autoConfirm?: boolean;
}

function BidPaymentConfirm({
  paymentId,
  amount,
  onSuccess,
  onError,
  submitLabel = "Complete Payment",
  submitClassName = "w-full btn-bid-premium h-12 text-base uppercase tracking-wider",
  autoConfirm = false,
}: Omit<BidPaymentElementProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmPayment = useConfirmPayment();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoConfirmStarted = useRef(false);

  const handlePay = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${ROUTES.STUDENT_MY_BIDS}`,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message || "Payment could not be completed";
      setErrorMessage(msg);
      onError?.(msg);
      setIsProcessing(false);
      return;
    }

    const stripeSucceeded =
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing" ||
        paymentIntent.status === "requires_capture");

    if (stripeSucceeded) {
      try {
        const result = await confirmPayment.mutateAsync({ id: paymentId });
        toast.success("Payment complete! Your booking is confirmed.");
        onSuccess(result.payment);
      } catch {
        onSuccess({
          id: paymentId,
          bidId: "",
          studentId: "",
          amount: paymentIntent.amount / 100 || amount,
          currency: paymentIntent.currency,
          status: PaymentStatus.CAPTURED,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.info("Payment received. Your confirmation is being finalized.");
      }
      setIsProcessing(false);
      return;
    }

    const msg = paymentIntent
      ? `Payment could not be completed (status: ${paymentIntent.status}).`
      : "Payment could not be completed.";
    setErrorMessage(msg);
    onError?.(msg);
    setIsProcessing(false);
  };

  const runAutoConfirm = useCallback(() => {
    if (!autoConfirm || autoConfirmStarted.current || !stripe || !elements) {
      return;
    }
    autoConfirmStarted.current = true;
    void handlePay();
  }, [autoConfirm, stripe, elements]);

  useEffect(() => {
    runAutoConfirm();
  }, [runAutoConfirm]);

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <PaymentElement />
      {errorMessage && (
        <p className="text-xs text-urgent">{errorMessage}</p>
      )}
      {!autoConfirm && (
        <Button
          type="submit"
          className={submitClassName}
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            "Processing…"
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      )}
      {autoConfirm && isProcessing && (
        <p className="text-xs text-muted text-center">Verifying with your bank…</p>
      )}
    </form>
  );
}

/** Resume payment on detail page for an accepted bid (same Payment Element flow as post–lock-in). */
export function ExistingBidPaymentSection({
  bid,
  onSuccess,
  onError,
  submitClassName,
  autoConfirm,
}: {
  bid: Bid;
  onSuccess: (payment: Payment) => void;
  onError?: (message: string) => void;
  submitClassName?: string;
  autoConfirm?: boolean;
}) {
  const { data: paymentData, isLoading } = usePaymentForBid(bid.id);
  const createPaymentIntent = useCreatePaymentIntent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const intentRequested = useRef(false);

  useEffect(() => {
    if (isLoading || clientSecret) return;

    const payment = paymentData?.payment;
    if (payment?.stripeClientSecret) {
      setClientSecret(payment.stripeClientSecret);
      setPaymentId(payment.id);
      return;
    }

    if (intentRequested.current || createPaymentIntent.isPending) return;
    intentRequested.current = true;

    createPaymentIntent.mutate(
      { bidId: bid.id },
      {
        onSuccess: (data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPaymentId(data.payment.id);
          } else {
            intentRequested.current = false;
          }
        },
        onError: () => {
          intentRequested.current = false;
        },
      },
    );
  }, [
    bid.id,
    clientSecret,
    createPaymentIntent.isPending,
    isLoading,
    paymentData?.payment?.id,
    paymentData?.payment?.stripeClientSecret,
  ]);

  if (isLoading || (!clientSecret && !paymentData?.payment)) {
    return (
      <p className="text-sm text-muted text-center py-2">Loading payment…</p>
    );
  }

  if (!clientSecret || !paymentId) {
    return (
      <p className="text-sm text-danger text-center py-2">
        Could not start payment. Please refresh and try again.
      </p>
    );
  }

  return (
    <BidPaymentElement
      clientSecret={clientSecret}
      paymentId={paymentId}
      amount={Number(bid.totalAmount)}
      onSuccess={onSuccess}
      onError={onError}
      submitClassName={submitClassName ?? "w-full btn-bid h-11"}
      autoConfirm={autoConfirm}
    />
  );
}

export function BidPaymentElement(props: BidPaymentElementProps) {
  if (!stripePromise) {
    return (
      <p className="text-sm text-muted">Payment system is not available.</p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: stripeElementsAppearance,
      }}
    >
      <BidPaymentConfirm {...props} />
    </Elements>
  );
}
