import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { Button } from "../ui/button";
import {
  COOKIE_CONSENT_KEY,
  setCookieConsentAccepted,
} from "../../../utils/cookieConsent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    setCookieConsentAccepted();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-3xl mx-auto gold-card p-4 md:p-5 shadow-glass">
        <p className="text-sm text-fg mb-3 leading-relaxed">
          We use cookies and similar technologies for analytics (Google Analytics,
          Microsoft Clarity, Meta Pixel) to improve your experience and measure
          conversions. See our{" "}
          <Link to={ROUTES.PRIVACY} className="text-gold hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to={ROUTES.TERMS} className="text-gold hover:underline">
            Terms of Use
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button className="btn-bid" size="sm" onClick={accept}>
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-line text-muted"
            onClick={accept}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
