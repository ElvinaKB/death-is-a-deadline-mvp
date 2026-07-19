import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Mail,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { Button } from "../components/ui/button";

interface LocationState {
  email?: string;
}

const EMAIL_PROVIDER_URLS: Record<string, string> = {
  "gmail.com": "https://mail.google.com/mail/u/0/#inbox",
  "googlemail.com": "https://mail.google.com/mail/u/0/#inbox",
  "outlook.com": "https://outlook.live.com/mail/0/inbox",
  "hotmail.com": "https://outlook.live.com/mail/0/inbox",
  "live.com": "https://outlook.live.com/mail/0/inbox",
  "yahoo.com": "https://mail.yahoo.com/",
  "icloud.com": "https://www.icloud.com/mail",
  "me.com": "https://www.icloud.com/mail",
};

function getEmailAppUrl(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase();
  return (domain && EMAIL_PROVIDER_URLS[domain]) || `mailto:${email}`;
}

const howItWorksSteps = [
  {
    icon: Search,
    title: "1. Find a Hotel",
    description: "Search your stay dates & hotel options",
  },
  {
    icon: DollarSign,
    title: "2. Place Your Bid",
    description: "Name your price, compared to the retail cost.",
  },
  {
    icon: Zap,
    title: "3. Get an Instant Decision",
    description: "If you guess the price, you win the room!",
  },
];

const nextSteps = [
  "Verify your email address",
  "Certain domains will be approved automatically, others will need manual verification",
  "Start bidding and try to guess the secret price on your favorite hotel!",
];

export function SignupSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as LocationState | null)?.email;

  useEffect(() => {
    if (!email) {
      navigate(ROUTES.SIGNUP, { replace: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* How it works — below confirmation on mobile */}
        <div className="order-2 lg:order-1 lg:w-1/2 flex flex-col justify-start px-4 sm:px-8 lg:px-16 pt-10 lg:pt-16 pb-10">
          <div className="max-w-lg mx-auto lg:mx-0">
            <Link to={ROUTES.HOME} className="inline-block mb-6">
              <span className="font-serif text-lg sm:text-xl tracking-[0.14em] text-fg leading-none">
                DEADLINE
              </span>
            </Link>

            <h1 className="text-3xl lg:text-5xl font-bold text-gold mb-4">
              YOLO! Let&apos;s GO!
            </h1>
            <p className="text-muted mb-2">
              You&apos;re one step closer to exclusive hotel rates.
            </p>
            <p className="text-muted mb-8">Here&apos;s how it works.</p>

            <div className="divide-y divide-line">
              {howItWorksSteps.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-4 py-4 first:pt-0">
                  <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg mb-1">{title}</h3>
                    <p className="text-sm text-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirmation card — first on mobile */}
        <div className="order-1 lg:order-2 lg:w-1/2 flex items-start justify-center px-4 py-8 sm:py-10 lg:pt-16 lg:pb-10 bg-glass/30">
          <div className="w-full max-w-md bg-glass-2 border border-line rounded-2xl shadow-glass p-6 sm:p-8 text-center">
            <div className="relative mx-auto mb-5 w-16 h-16">
              <Sparkles className="absolute -top-1 -left-2 w-4 h-4 text-gold" />
              <Sparkles className="absolute -bottom-1 -right-2 w-3 h-3 text-gold" />
              <div className="w-16 h-16 rounded-full bg-success/15 border-2 border-success flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-fg mb-2">
              Account Created!
            </h1>
            <p className="text-muted mb-6">
              Check your email to verify your account and start bidding on
              hotel stays.
            </p>

            <div className="flex items-start gap-3 text-left border border-line rounded-xl p-4 mb-6 bg-glass">
              <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">
                  Verification email sent to:
                </p>
                <p className="text-sm text-success font-medium break-all">
                  {email}
                </p>
                <p className="text-xs text-muted mt-1">
                  Didn&apos;t receive it? Check your spam or promotions
                  folder.
                </p>
              </div>
            </div>

            <div className="text-left mb-6">
              <p className="text-sm font-semibold text-fg mb-3">
                What happens next?
              </p>
              <ul className="space-y-2">
                {nextSteps.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-muted">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild className="w-full btn-bid mb-4">
              <a href={getEmailAppUrl(email)} target="_blank" rel="noreferrer">
                <Mail className="w-4 h-4 mr-2" />
                Open Email App
              </a>
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted mb-4">
              <div className="flex-1 h-px bg-line" />
              or
              <div className="flex-1 h-px bg-line" />
            </div>

            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-2 text-sm text-brand hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
