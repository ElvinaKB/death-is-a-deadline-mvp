import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { supabase } from "../../utils/supabaseClient";
import { ROUTES } from "../../config/routes.config";
import { ApprovalStatus, UserRole } from "../../types/auth.types";

function parseHashParams(hash: string) {
  const params: Record<string, string> = {};
  hash
    .replace(/^#/, "")
    .split("&")
    .forEach((kv) => {
      const [key, value] = kv.split("=");
      if (key && value) params[key] = decodeURIComponent(value);
    });
  return params;
}

export function RedirectPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = parseHashParams(window.location.hash);
    const access_token = params["access_token"];
    const refresh_token = params["refresh_token"];
    const expires_in = params["expires_in"];
    const token_type = params["token_type"];

    if (!access_token) {
      navigate(ROUTES.LOGIN);
      return;
    }

    const setCookies = () => {
      // Store tokens in cookies
      Cookies.set("access_token", access_token);
      Cookies.set("refresh_token", refresh_token);
      Cookies.set("token_type", token_type);
      Cookies.set("expires_in", expires_in);
    };

    const resetCookies = () => {
      // Store tokens in cookies
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      Cookies.remove("token_type");
      Cookies.remove("expires_in");
      supabase.auth.signOut();
    };
    setCookies();

    // setAuthToken(access_token);

    // Fetch user details from Supabase
    supabase.auth.getUser(access_token).then(({ data, error }) => {
      if (error || !data.user) {
        setError(error?.message || "Failed to fetch user data");
        resetCookies();
        return;
      }
      const user = {
        ...data.user,
        name: data.user.user_metadata?.name,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at ?? "",
        email: data.user.email ?? "",
        role: data.user.role as UserRole,
        approvalStatus: data.user.user_metadata?.approvalStatus,
      };

      if (user.approvalStatus !== ApprovalStatus.APPROVED) {
        resetCookies();
        return setError(
          "Your account is under approval by our team. You will be notified once it's approved."
        );
      }

      dispatch(
        setCredentials({
          user,
          token: access_token,
        })
      );
      navigate(ROUTES.HOME);
    });
  }, [dispatch, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="glass-2 shadow-lg rounded-lg p-8 flex flex-col items-center gap-4 min-w-[320px]">
        {error ? (
          <>
            <div className="text-error text-lg font-semibold text-center">
              {error}
            </div>
            <button
              className="btn-bid mt-2"
              onClick={() => (window.location.href = "/login")}
            >
              Go to Login Page
            </button>
          </>
        ) : (
          <div className="text-fg text-lg font-medium">Redirecting...</div>
        )}
      </div>
    </div>
  );
}
