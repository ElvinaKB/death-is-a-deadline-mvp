import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import { AuthResponse } from "../../types/auth.types";
import { toast } from "sonner";

function decodeReturnUrl(state: string | null): string {
  if (!state) return ROUTES.HOME;
  try {
    const decoded = JSON.parse(atob(state));
    return typeof decoded?.returnUrl === "string" ? decoded.returnUrl : ROUTES.HOME;
  } catch {
    return ROUTES.HOME;
  }
}

export function LinkedInCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  const linkedinMutation = useApiMutation<AuthResponse, { code: string }>({
    endpoint: ENDPOINTS.LINKEDIN_CALLBACK,
    showErrorToast: false,
    onSuccess: (data) => {
      dispatch(
        setCredentials({ user: data.user, token: data.token.access_token }),
      );
      Cookies.set("access_token", data.token.access_token);
      Cookies.set("refresh_token", data.token.refresh_token);
      Cookies.set("token_type", data.token.token_type);
      Cookies.set("expires_in", data.token.expires_in.toString());
      setAuthToken(data.token.access_token);
      toast.success("Signed in with LinkedIn!");
      navigate(decodeReturnUrl(searchParams.get("state")), { replace: true });
    },
    onError: (error) => {
      setErrorMessage(error.message || "Something went wrong signing in with LinkedIn.");
    },
  });

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setErrorMessage("Missing authorization code from LinkedIn.");
      return;
    }

    linkedinMutation.mutate({ code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {errorMessage ? (
          <>
            <h1 className="text-2xl font-bold text-fg">Couldn&apos;t sign in</h1>
            <p className="text-muted">{errorMessage}</p>
            <Link
              to={ROUTES.LOGIN}
              className="inline-block text-brand hover:underline font-medium"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-brand" />
            <p className="text-muted">Signing you in with LinkedIn...</p>
          </>
        )}
      </div>
    </div>
  );
}
