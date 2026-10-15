import { useEffect, useRef, useState } from "react";
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

const SDK_URL = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";

declare global {
  interface Window {
    LiteAPIPayment?: new (config: Record<string, unknown>) => { handlePayment: () => void };
  }
}

function loadSdk(): Promise<void> {
  if (window.LiteAPIPayment) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Payment form failed to load")));
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
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
  const mounted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    loadSdk()
      .then(() => {
        const Payment = window.LiteAPIPayment;
        if (!Payment) throw new Error("Payment form failed to load");
        new Payment({
          publicKey: session.environment,
          secretKey: session.secretKey,
          targetElement: "#nuitee-payment",
          returnUrl: `${window.location.origin}/member/booking-complete/${session.bidId}`,
          appearance: { theme: "flat" },
          options: { business: { name: "Deadline Travel" } },
        }).handlePayment();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4"
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
        <div className="mt-5 min-h-[260px] rounded-xl bg-white p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-base text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading secure payment…
            </div>
          )}
          {error && <p className="py-10 text-center text-base text-red-600">{error}</p>}
          <div id="nuitee-payment" />
        </div>
      </div>
    </div>
  );
}
