import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { stripePromise } from "../../../lib/stripe";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { ROUTES } from "../../../config/routes.config";
import { formatBookingDate } from "../../../utils/dateHelpers";

interface NoShowCharge {
  id: string;
  status: "PENDING" | "REQUIRES_ACTION" | "SUCCEEDED" | "FAILED";
  amount: number;
  hotel: string;
  city: string;
  checkInDate: string;
  checkOutDate: string;
  clientSecret: string | null;
  paymentMethodId: string | null;
}

/**
 * Linked from the "Action needed" email: the guest's bank wants them to
 * approve a no-show charge (3D Secure) that we couldn't complete off-session.
 */
export function NoShowApprovePage() {
  const { id = "" } = useParams<{ id: string }>();
  const [charge, setCharge] = useState<NoShowCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<NoShowCharge>(getEndpoint(ENDPOINTS.PAYMENT_NO_SHOW, { id }))
      .then(setCharge)
      .catch((e: { message?: string }) => setError(e.message || "Charge not found"));
  }, [id]);

  const approve = async () => {
    if (!charge?.clientSecret || !charge.paymentMethodId) return;
    setWorking(true);
    setError(null);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Payments are unavailable right now.");
      const result = await stripe.confirmCardPayment(charge.clientSecret, {
        payment_method: charge.paymentMethodId,
      });
      if (result.error) throw new Error(result.error.message);
      setCharge(
        await apiClient.post<NoShowCharge>(
          getEndpoint(ENDPOINTS.PAYMENT_NO_SHOW_SYNC, { id }),
          {},
        ),
      );
    } catch (e) {
      setError((e as { message?: string }).message || "Your bank didn't approve it.");
    } finally {
      setWorking(false);
    }
  };

  const amount = charge
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        charge.amount,
      )
    : "";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {!charge && !error && (
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-gold" />
      )}

      {!charge && error && (
        <>
          <AlertTriangle className="mx-auto h-14 w-14 text-urgent" />
          <h1 className="mt-6 text-2xl font-bold text-fg">We couldn&apos;t find that</h1>
          <p className="mt-2 text-base text-muted">{error}</p>
        </>
      )}

      {charge?.status === "REQUIRES_ACTION" && (
        <>
          <ShieldCheck className="mx-auto h-14 w-14 text-gold" />
          <h1 className="mt-6 text-2xl font-bold text-fg">Approve no-show charge</h1>
          <p className="mt-2 text-base text-muted">
            {charge.hotel} reported that you didn&apos;t arrive for your stay on{" "}
            {formatBookingDate(charge.checkInDate, "MMM d, yyyy")}. Under the
            no-show policy you agreed to at booking, the first night ({amount}) is
            charged to your saved card. Your bank needs you to approve it.
          </p>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <button
            type="button"
            onClick={() => void approve()}
            disabled={working}
            className="btn-bid mt-8 inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-semibold uppercase disabled:opacity-60"
          >
            {working ? "Waiting for your bank…" : `Approve ${amount}`}
          </button>
          <p className="mt-6 text-sm text-muted">
            Think this is a mistake? Reply to the email we sent and we&apos;ll sort
            it out with the hotel.
          </p>
        </>
      )}

      {charge && charge.status !== "REQUIRES_ACTION" && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-6 text-2xl font-bold text-fg">
            {charge.status === "SUCCEEDED" ? "All set" : "Nothing to do here"}
          </h1>
          <p className="mt-2 text-base text-muted">
            {charge.status === "SUCCEEDED"
              ? `The ${amount} no-show charge for ${charge.hotel} is complete. A receipt is in your inbox.`
              : "This charge doesn't need anything from you right now."}
          </p>
          <Link
            to={ROUTES.STUDENT_MY_BIDS}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg border border-line px-6 text-base font-semibold text-fg"
          >
            Go to my bookings
          </Link>
        </>
      )}
    </div>
  );
}
