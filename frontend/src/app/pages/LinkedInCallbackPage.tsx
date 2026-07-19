import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import {
  LinkedInVerifyResponse,
  LinkedInCompleteRequest,
  LinkedInCompleteResponse,
} from "../../types/auth.types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";

type Phase = "verifying" | "form" | "success" | "error";

export function LinkedInCallbackPage() {
  const [searchParams] = useSearchParams();
  const attempted = useRef(false);

  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState<LinkedInVerifyResponse | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const verifyMutation = useApiMutation<LinkedInVerifyResponse, { code: string }>({
    endpoint: ENDPOINTS.LINKEDIN_CALLBACK,
    showErrorToast: false,
    onSuccess: (data) => {
      setVerified(data);
      setPhase("form");
    },
    onError: (error) => {
      setErrorMessage(error.message || "Something went wrong verifying your LinkedIn account.");
      setPhase("error");
    },
  });

  const completeMutation = useApiMutation<LinkedInCompleteResponse, LinkedInCompleteRequest>({
    endpoint: ENDPOINTS.LINKEDIN_COMPLETE,
    showErrorToast: false,
    onSuccess: () => {
      setPhase("success");
    },
    onError: (error) => {
      setFormError(error.message || "Something went wrong creating your account.");
    },
  });

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setErrorMessage("Missing authorization code from LinkedIn.");
      setPhase("error");
      return;
    }

    verifyMutation.mutate({ code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!verified) return;
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }
    if (!linkedinProfileUrl.includes("linkedin.com")) {
      setFormError("Enter your LinkedIn profile URL (e.g. linkedin.com/in/yourname).");
      return;
    }

    completeMutation.mutate({
      verificationToken: verified.verificationToken,
      password,
      linkedinProfileUrl,
    });
  };

  return (
    <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        {phase === "verifying" && (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-brand" />
            <p className="text-muted">Verifying your LinkedIn account...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-fg">Couldn&apos;t sign in</h1>
            <p className="text-muted">{errorMessage}</p>
            <Link
              to={ROUTES.SIGNUP}
              className="inline-block text-brand hover:underline font-medium"
            >
              Back to sign up
            </Link>
          </div>
        )}

        {phase === "form" && verified && (
          <Card className="bg-glass-2 border-line shadow-glass">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-fg">
                Almost there
              </CardTitle>
              <CardDescription className="text-center text-muted">
                LinkedIn verified {verified.email}. Set a password and share
                your profile link for a quick manual review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="linkedinProfileUrl" className="text-fg">
                    LinkedIn Profile URL
                  </Label>
                  <Input
                    id="linkedinProfileUrl"
                    type="url"
                    placeholder="https://www.linkedin.com/in/yourname"
                    value={linkedinProfileUrl}
                    onChange={(e) => setLinkedinProfileUrl(e.target.value)}
                    className="bg-glass border-line text-fg placeholder:text-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-fg">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-glass border-line text-fg placeholder:text-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-fg">
                    Confirm Password
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-glass border-line text-fg placeholder:text-muted"
                  />
                </div>

                {formError && (
                  <p className="text-sm text-danger" role="alert">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full btn-bid"
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? "Submitting..." : "Submit for review"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {phase === "success" && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <h1 className="text-2xl font-bold text-fg">Account created!</h1>
            <p className="text-muted">
              Your LinkedIn profile is being manually reviewed. We&apos;ll
              email you once you&apos;re approved.
            </p>
            <Link
              to={ROUTES.HOME}
              className="inline-block text-brand hover:underline font-medium"
            >
              Back to marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
