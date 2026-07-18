import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { isValidEmail } from "../../utils/emailValidator";

interface WaitlistRequest {
  fullName: string;
  email: string;
  phone?: string;
  source?: string;
}

const HEAR_ABOUT_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "friend_referral", label: "Friend or referral" },
  { value: "hotel_partner", label: "A hotel partner" },
  { value: "conference_event", label: "Conference or event" },
  { value: "google_search", label: "Google search" },
  { value: "other", label: "Other" },
];

export function WaitlistPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const waitlistMutation = useApiMutation<
    { success: boolean; message: string },
    WaitlistRequest
  >({
    endpoint: ENDPOINTS.WAITLIST_JOIN,
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      setFormError(error.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    waitlistMutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      source: source || undefined,
    });
  };

  const handleShare = async () => {
    const shareText =
      "Deadline is a private marketplace where verified travelers bid blind on unsold hotel inventory. Independent hotels set a secret price — if a bid meets it, the room is instantly booked. Check it out: https://www.deadlinetravel.com";

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: "https://www.deadlinetravel.com" });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied — paste it anywhere to share!");
    } catch {
      toast.error("Couldn't copy. Try sharing deadlinetravel.com directly.");
    }
  };

  return (
    <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <Link to={ROUTES.HOME} className="flex justify-center mb-8">
          <span className="font-serif text-xl tracking-[0.14em] text-gold leading-none">
            DEADLINE
          </span>
        </Link>

        {!submitted ? (
          <div className="bg-glass-2 border border-line rounded-2xl shadow-glass p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-fg text-center mb-6">
              Join the Waitlist
            </h1>

            <div className="text-center mb-8 space-y-2">
              <p className="text-xl font-bold">
                <span className="text-fg">Guess the price. </span>
                <span className="text-gold">Win the room.</span>
              </p>
              <p className="text-muted">
                Be the first to access private hotel pricing from
                independent hotels.
              </p>
              <p className="text-muted">
                Join thousands of verified travelers waiting for launch.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-fg">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-fg">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-fg">
                  Phone # <span className="text-muted font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-fg">
                  Where did you hear about us?
                </Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="source" className="bg-glass border-line text-fg">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEAR_ABOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formError && (
                <p className="text-sm text-danger" role="alert">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full btn-bid"
                disabled={waitlistMutation.isPending}
              >
                {waitlistMutation.isPending ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-glass-2 border border-line rounded-2xl shadow-glass p-6 sm:p-8 text-center space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-fg mb-2">
                🎉 You&apos;re on the list.
              </h1>
              <p className="text-muted">
                We&apos;ll email you when hotels in your city go live.
              </p>
            </div>

            <div className="border-t border-line pt-6 space-y-3">
              <h2 className="text-lg font-semibold text-fg">
                Know an independent hotel?
              </h2>
              <p className="text-muted text-sm">Tell them about Deadline.</p>
              <Button
                type="button"
                variant="outline"
                className="border-line bg-glass"
                onClick={handleShare}
              >
                Share Deadline
              </Button>
            </div>

            <Link
              to={ROUTES.HOME}
              className="inline-block text-sm text-brand hover:underline font-medium"
            >
              Back to marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
