import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { ROUTES } from "../../../config/routes.config";
import { getPublicPlaceUrl } from "../../../utils/placeUrl";
import type { BidDetailResponse } from "../../../types/bid.types";
import { AcceptedOutcomeSparkles } from "../../components/bids/AcceptedOutcomeSparkles";

/**
 * Nuitee's payment form redirects here after the member pays. We confirm the
 * booking with Nuitee (safe to retry), then hand off to the hotel page's
 * "You're All Set" receipt (confetti + what was paid and what's due at check-in).
 */
export function WholesaleBookingCompletePage() {
  const { bidId = "" } = useParams<{ bidId: string }>();
  const navigate = useNavigate();
  const started = useRef(false);
  const [state, setState] = useState<
    | { kind: "working" }
    | { kind: "done"; code: string | null }
    | { kind: "failed"; message: string }
  >({ kind: "working" });

  useEffect(() => {
    if (started.current || !bidId) return;
    started.current = true;
    apiClient
      .post<{ confirmationCode: string | null }>(
        getEndpoint(ENDPOINTS.WHOLESALE_CHECKOUT_COMPLETE, { bidId }),
        {},
      )
      .then(async (r) => {
        try {
          const { bid } = await apiClient.get<BidDetailResponse>(
            getEndpoint(ENDPOINTS.BID_DETAIL, { id: bidId }),
          );
          if (bid.place?.slug) {
            navigate(getPublicPlaceUrl(bid.place, { bidId }), { replace: true });
            return;
          }
        } catch {
          // Fall through to the simple confirmation below.
        }
        setState({ kind: "done", code: r.confirmationCode });
      })
      .catch((e: { message?: string }) =>
        setState({ kind: "failed", message: e.message || "Something went wrong" }),
      );
  }, [bidId, navigate]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {state.kind === "working" && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-gold" />
          <h1 className="mt-6 text-2xl font-bold text-fg">Confirming your room…</h1>
          <p className="mt-2 text-base text-muted">
            Your payment went through. We&apos;re confirming the reservation with
            the hotel — this takes a few seconds.
          </p>
        </>
      )}
      {state.kind === "done" && (
        <>
          <AcceptedOutcomeSparkles />
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-6 text-3xl font-bold text-fg">You&apos;re booked!</h1>
          <p className="mt-2 text-base text-muted">
            A confirmation email is on its way.
            {state.code ? ` Hotel confirmation number: ${state.code}.` : ""}
          </p>
          <Link
            to={ROUTES.STUDENT_MY_BIDS}
            className="btn-bid mt-8 inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-semibold uppercase"
          >
            View my bookings
          </Link>
        </>
      )}
      {state.kind === "failed" && (
        <>
          <AlertTriangle className="mx-auto h-14 w-14 text-urgent" />
          <h1 className="mt-6 text-2xl font-bold text-fg">We&apos;re on it</h1>
          <p className="mt-2 text-base text-muted">{state.message}</p>
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
