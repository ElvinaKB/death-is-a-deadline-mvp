import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { ROUTES } from "../../config/routes.config";
import { ENDPOINTS } from "../../config/endpoints.config";
import { API_BASE_URL } from "../../lib/apiClient";

/** Read by LinkedInCallbackPage after the OAuth round-trip to route into the referral-partner completion flow instead of the traveler one. */
export const REFERRER_LINKEDIN_INTENT_KEY = "deadline_linkedin_intent";

export function ReferralSignupPage() {
  const handleLinkedInSignup = () => {
    try {
      sessionStorage.setItem(REFERRER_LINKEDIN_INTENT_KEY, "referrer");
    } catch {
      /* sessionStorage unavailable — not worth blocking on */
    }
    window.location.href = `${API_BASE_URL}${ENDPOINTS.LINKEDIN_AUTHORIZE}`;
  };

  return (
    <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-6">
        <Link to={ROUTES.HOME} className="flex justify-center">
          <span className="font-serif text-xl tracking-[0.14em] text-gold">
            DEADLINE
          </span>
        </Link>
        <Card className="bg-glass-2 border-line shadow-glass">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-fg">
              Become a Referral Partner
            </CardTitle>
            <CardDescription className="text-center text-muted">
              Introduce a hotel to Deadline and earn 50% of our commission on
              their bookings for a full year — no cap, no selling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2 text-sm text-muted list-disc pl-5">
              <li>
                Sign up now with LinkedIn — refer a hotel whenever you come
                across one, there&apos;s no deadline.
              </li>
              <li>
                You&apos;ll also get a normal traveler account, so you can bid
                on rooms from day one.
              </li>
              <li>
                No ID upload, no waiting — LinkedIn verifies you instantly.
              </li>
              <li>
                Already have a Deadline account? This still works — we match
                by your LinkedIn email and just add referral access to it.
              </li>
            </ul>
            <Button
              type="button"
              className="w-full btn-bid"
              onClick={handleLinkedInSignup}
            >
              <Linkedin className="w-4 h-4 mr-2" />
              Sign Up with LinkedIn
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
