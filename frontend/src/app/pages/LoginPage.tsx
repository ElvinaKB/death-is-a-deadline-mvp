import { useFormik } from "formik";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { clearPreviewBypassLoggedOut } from "../../config/previewBypass";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { loginSchema } from "../../utils/validationSchemas";
import { getFieldError, getFieldDescribedBy, getFieldErrorId } from "../../utils/formikHelpers";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import {
  LoginRequest,
  AuthResponse,
  UserRole,
  ApprovalStatus,
} from "../../types/auth.types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { PendingApprovalAlert } from "../components/common/PendingApprovalAlert";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useState } from "react";
import howItWorksGif from "../../assets/login-how-it-works.gif";

import { useHotel } from "../../hooks/useHotel";
interface LocationState {
  returnUrl?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [credentials, setCredentialsState] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const { setHotel } = useHotel();

  // Get return URL from location state
  const locationState = location.state as LocationState | null;
  const returnUrl = locationState?.returnUrl;

  const loginMutation = useApiMutation<AuthResponse, LoginRequest>({
    endpoint: ENDPOINTS.LOGIN,
    onSuccess: (data) => {
      setCredentialsState({ ...credentials, email: formik.values.email });
      // Check if student is pending approval
      if (
        data.user.role === UserRole.STUDENT &&
        data.user.approvalStatus === ApprovalStatus.PENDING
      ) {
        return;
      }

      clearPreviewBypassLoggedOut();
      dispatch(
        setCredentials({ user: data.user, token: data.token.access_token }),
      );

      Cookies.set("access_token", data.token.access_token);
      Cookies.set("refresh_token", data.token.refresh_token);
      Cookies.set("token_type", data.token.token_type);
      Cookies.set("expires_in", data.token.expires_in.toString());
      setAuthToken(data.token.access_token);
      toast.success("Login successful!");

      // Redirect to return URL if coming from a place, otherwise role-based redirect
      if (returnUrl) {
        navigate(returnUrl);
        return;
      }

      // Redirect based on role
      switch (data.user.role) {
        case UserRole.ADMIN:
          navigate(ROUTES.ADMIN_DASHBOARD);
          break;
        case UserRole.STUDENT:
          navigate(ROUTES.HOME);
          break;
        case UserRole.HOTEL_OWNER:
          // Auto-select first hotel on login
          if (data.user.places && data.user.places.length > 0) {
            setHotel(data.user.places[0]);
          }
          navigate(ROUTES.HOTEL_DASHBOARD);
          break;
        default:
          navigate("/");
      }
    },
  });

  const formik = useFormik<LoginRequest>({
    initialValues: credentials,
    enableReinitialize: true,
    validationSchema: loginSchema,
    onSubmit: (values) => {
      loginMutation.mutate(values);
    },
  });

  // Check if the user is pending after login attempt
  const isPending =
    loginMutation.isSuccess &&
    loginMutation.data.user.role === UserRole.STUDENT &&
    loginMutation.data.user.approvalStatus === ApprovalStatus.PENDING;

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      <main id="main-content" className="flex flex-col lg:flex-row min-h-screen" tabIndex={-1}>
        {/* Explainer — below form on mobile */}
        <div className="order-2 lg:order-1 lg:w-1/2 flex flex-col justify-start px-4 sm:px-8 lg:px-16 pt-8 lg:pt-12 pb-10">
          <div className="max-w-lg mx-auto lg:mx-0">
            {/* Logo/Brand */}
            <Link to={ROUTES.HOME} className="inline-block mb-6">
              <span className="font-serif text-lg sm:text-xl tracking-[0.14em] text-gold leading-none">
                DEADLINE
              </span>
            </Link>

            {/* Main Headline */}
            <h1 className="text-3xl lg:text-4xl font-bold text-fg mb-4">
              Welcome Back, Traveler
            </h1>
            <p className="text-lg text-muted mb-6">
              Your next adventure awaits. Log in to continue bidding
            </p>
          </div>

          <img
            src={howItWorksGif}
            alt="How It Works - animated walkthrough of placing a bid"
            className="w-full max-w-2xl h-auto rounded-2xl border border-line mx-auto lg:mx-0"
          />
        </div>

        {/* Login form — first on mobile, the main focus of the page */}
        <div className="order-1 lg:order-2 lg:w-1/2 flex items-center justify-center px-4 py-8 sm:py-10 lg:py-0 bg-glass/30">
          <Card className="w-full max-w-xl bg-glass-2 border-line shadow-glass relative z-10">
            <CardHeader className="space-y-2 pt-10">
              <CardTitle className="text-4xl font-bold text-center text-fg">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center text-muted text-base">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-10 sm:px-10">
              {isPending && (
                <div className="mb-4">
                  <PendingApprovalAlert />
                </div>
              )}

              <form onSubmit={formik.handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-fg">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={!!getFieldError("email", formik)}
                    aria-describedby={getFieldDescribedBy("email", formik)}
                    {...formik.getFieldProps("email")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("email", formik) ? "border-danger" : ""
                    }`}
                  />
                  {getFieldError("email", formik) && (
                    <p
                      id={getFieldErrorId("email")}
                      className="text-sm text-danger"
                      role="alert"
                    >
                      {getFieldError("email", formik)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-fg">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!getFieldError("password", formik)}
                    aria-describedby={getFieldDescribedBy("password", formik)}
                    {...formik.getFieldProps("password")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("password", formik) ? "border-danger" : ""
                    }`}
                  />
                  {getFieldError("password", formik) && (
                    <p
                      id={getFieldErrorId("password")}
                      className="text-sm text-danger"
                      role="alert"
                    >
                      {getFieldError("password", formik)}
                    </p>
                  )}
                </div>

                <div className="flex justify-end  ">
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-brand hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-bid"
                  disabled={
                    (loginMutation.isPending || isPending) && !formik.dirty
                  }
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted">Don't have an account? </span>
                <Link
                  to={ROUTES.SIGNUP}
                  state={returnUrl ? { returnUrl } : undefined}
                  className="text-brand hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
