import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Lock, X } from "lucide-react";
import { formatCurrencyCents } from "../../../utils/currency";

export interface NuiteeCheckoutSession {
  bidId: string;
  paymentId: string;
  secretKey: string;
  environment: "sandbox" | "live";
  price: number;
  currency: string;
}

/**
 * Payment step for wholesale (Nuitee) hotels. Nuitee is the merchant of
 * record: the member pays Nuitee in Nuitee's hosted card form, then Nuitee
 * redirects to our booking-complete page, which confirms the booking.
 */
export function NuiteeCheckout({
  session,
  hotelName,
  onClose,
}: {
  session: NuiteeCheckoutSession;
  hotelName: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  // Nuitee's form runs in its own isolated page (public/nuitee-pay.html) so the
  // site's Stripe.js can't interfere; the hash never leaves the browser.
  const src = `/nuitee-pay.html#${new URLSearchParams({
    sk: session.secretKey,
    env: session.environment,
    bid: session.bidId,
  }).toString()}`;

  // Lock page scroll while the checkout is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Rendered into <body> so no parent's sticky/stacking layout (the bid
  // panel) can trap it under the photo gallery.
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Complete your booking"
    >
      <div className="relative my-8 w-full max-w-lg rounded-2xl border border-gold/40 bg-bg p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted hover:text-fg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
          Your bid won!
        </p>
        <h2 className="mt-1 text-2xl font-bold text-fg">Complete your booking</h2>
        <p className="mt-1 text-base text-muted">{hotelName}</p>
        <p className="mt-3 text-3xl font-bold text-fg">
          {formatCurrencyCents(session.price)}
          <span className="ml-1 text-base font-normal text-muted">total</span>
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          Payment is processed securely by our booking partner Nuitée, who
          handles this reservation with the hotel. Your card statement will show
          Nuitée.
        </p>
        {session.environment === "sandbox" && (
          <p className="mt-2 rounded-md bg-glass px-3 py-2 text-sm text-muted">
            Test mode: use card 4242 4242 4242 4242, any future date, any CVC.
          </p>
        )}
        <div className="relative mt-5 overflow-hidden rounded-xl bg-white">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-base text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading secure payment…
            </div>
          )}
          <iframe
            title="Secure payment by Nuitée"
            src={src}
            onLoad={() => setLoaded(true)}
            className="block h-[560px] w-full border-0"
            allow="payment *"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
