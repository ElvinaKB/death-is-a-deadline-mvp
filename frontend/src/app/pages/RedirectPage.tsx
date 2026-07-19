import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { supabase } from "../../utils/supabaseClient";
import { ROUTES } from "../../config/routes.config";
import { ApprovalStatus, UserRole } from "../../types/auth.types";
import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../../utils/analytics";
import hotelCheckinBackground from "../../assets/hotel-checkin.jpg";

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
  const [status, setStatus] = useState<
    { message: string; subMessage?: string } | null
  >(null);

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
        setStatus({ message: error?.message || "Failed to fetch user data" });
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
        setStatus({
          message: "Your account is under review by our team.",
          subMessage: "We will notify you via email once your access is approved.",
        });
        return;
      }

      dispatch(
        setCredentials({
          user,
          token: access_token,
        })
      );
      if (user.email?.toLowerCase().endsWith(".edu")) {
        trackEvent(ANALYTICS_EVENTS.EDU_VERIFICATION_COMPLETED);
      }
      navigate(ROUTES.HOME);
    });
  }, [dispatch, navigate]);

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-fixed flex flex-col items-center justify-center px-5 py-16 text-center text-white"
      style={{ backgroundImage: `url(${hotelCheckinBackground})` }}
    >
      <div className="absolute inset-0 bg-black/65" />

      <div className="relative flex flex-col items-center">
        <span className="text-4xl sm:text-6xl font-extrabold uppercase tracking-[0.08em] mb-12">
          Deadline
        </span>

        <div className="max-w-xl w-full">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            Thank you!
          </h1>
          <p className="text-lg sm:text-2xl text-gold tracking-wide mb-10">
            Your email is confirmed.
          </p>

          <div className="mb-10">
            {status ? (
              <>
                <p className="text-base sm:text-lg leading-relaxed">
                  {status.message}
                </p>
                {status.subMessage && (
                  <p className="text-sm sm:text-base text-white/60 mt-2">
                    {status.subMessage}
                  </p>
                )}
              </>
            ) : (
              <p className="text-base sm:text-lg leading-relaxed">
                Redirecting&hellip;
              </p>
            )}
          </div>

          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-4 rounded font-bold uppercase tracking-[0.15em] text-sm hover:bg-gold transition-colors"
          >
            Go to Login Page <span className="text-lg">&rarr;</span>
          </Link>
        </div>
      </div>

      <div className="relative sm:absolute sm:bottom-10 mt-16 sm:mt-0 flex items-center gap-6 text-sm text-white/60">
        <span>&copy; {new Date().getFullYear()} Deadline</span>
        <Link to={ROUTES.CONTACT} className="text-white/80 hover:text-white hover:underline">
          Need help? Contact us
        </Link>
      </div>
    </div>
  );
}
