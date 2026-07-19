import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { isValidEmail } from "../../../utils/emailValidator";

const SEEN_KEY = "newsletterPopupSeen";

export function NewsletterSignupModal() {
  const [open, setOpen] = useState(
    () => localStorage.getItem(SEEN_KEY) !== "true",
  );
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const close = () => {
    setOpen(false);
    localStorage.setItem(SEEN_KEY, "true");
  };

  const subscribeMutation = useApiMutation<
    { success: boolean; message: string },
    { email: string }
  >({
    endpoint: ENDPOINTS.NEWSLETTER_SUBSCRIBE,
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're on the list!");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    subscribeMutation.mutate({ email });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? close() : setOpen(val))}>
      <DialogContent className="max-w-md">
        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <DialogHeader>
              <DialogTitle className="text-fg text-center">
                You're in!
              </DialogTitle>
              <DialogDescription className="text-muted text-center">
                Thanks for signing up — we'll keep you posted on new hotels
                and deals.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-4" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <DialogHeader>
              <DialogTitle className="text-fg">
                Get the best deals first
              </DialogTitle>
              <DialogDescription className="text-muted">
                Join our newsletter for new hotel drops and exclusive deals.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="newsletter-email" className="sr-only">
                Email
              </Label>
              <Input
                id="newsletter-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={subscribeMutation.isPending}
            >
              {subscribeMutation.isPending ? "Signing up..." : "Sign up"}
            </Button>
            <button
              type="button"
              onClick={close}
              className="w-full text-sm text-muted hover:text-fg transition-colors"
            >
              Maybe later
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
