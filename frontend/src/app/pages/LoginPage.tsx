import { useFormik } from "formik";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { loginSchema } from "../../utils/validationSchemas";
import { getFieldError } from "../../utils/formikHelpers";
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
import {
  Hourglass,
  GraduationCap,
  Shield,
  Zap,
  DollarSign,
} from "lucide-react";

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
      {/* Full-screen explainer layout */}
      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        {/* Left Side - Explainer Content */}
        <div className="lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">
          <div className="max-w-lg mx-auto lg:mx-0">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 mb-8">
              <Hourglass className="w-8 h-8 text-brand" />
              <span className="text-xl font-bold text-fg">
                Death is a Deadline
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl lg:text-4xl font-bold text-fg mb-4">
              Welcome Back, Traveler
            </h1>
            <p className="text-lg text-muted mb-8">
              Your next adventure awaits. Log in to continue bidding on
              exclusive student rates.
            </p>

            {/* Benefits Reminder */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Student-Exclusive Deals
                  </h3>
                  <p className="text-sm text-muted">
                    Access rates that regular booking sites can't offer. Your
                    student status is your superpower.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Your Bids, Your Prices
                  </h3>
                  <p className="text-sm text-muted">
                    Pick up where you left off. Check your pending bids or place
                    new ones.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Secure & Private
                  </h3>
                  <p className="text-sm text-muted">
                    Your data stays safe. We never share your information with
                    third parties.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">Instant Access</h3>
                  <p className="text-sm text-muted">
                    No waiting. Log in and start bidding in seconds.
                  </p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="border-l-2 border-brand pl-4">
              <p className="text-muted italic">
                "Time waits for no one. Neither do hotel deals."
              </p>
              <p className="text-sm text-muted mt-1">— The Grim Keeper</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-1/2 flex items-center justify-center px-4 py-12 lg:py-0 bg-glass/30">
          <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-fg">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center text-muted">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending && (
                <div className="mb-4">
                  <PendingApprovalAlert />
                </div>
              )}

              <form onSubmit={formik.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-fg">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...formik.getFieldProps("email")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("email", formik) ? "border-danger" : ""
                    }`}
                  />
                  {getFieldError("email", formik) && (
                    <p className="text-sm text-danger">
                      {getFieldError("email", formik)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-fg">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...formik.getFieldProps("password")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("password", formik) ? "border-danger" : ""
                    }`}
                  />
                  {getFieldError("password", formik) && (
                    <p className="text-sm text-danger">
                      {getFieldError("password", formik)}
                    </p>
                  )}
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
      </div>
    </div>
  );
}
