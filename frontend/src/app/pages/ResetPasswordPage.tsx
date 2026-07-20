import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import { Button } from "../components/ui/button";
import { PasswordInput } from "../components/ui/password-input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { toast } from "sonner";
import { Hourglass, Lock, CheckCircle, AlertCircle } from "lucide-react";
import * as Yup from "yup";
import { supabase } from "../../utils/supabaseClient";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
import { UserRole } from "../../types/auth.types";
import { useHotel } from "../../hooks/useHotel";

const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:4000";

const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

interface ResetPasswordRequest {
  password: string;
}

interface ResetPasswordResponse {
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      role: UserRole;
      approvalStatus?: string;
      name?: string;
      places?: { id: string; name: string }[];
    };
    token: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };
  };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { setHotel } = useHotel();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Extract access token from URL hash (Supabase sends it as fragment)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (token && type === "recovery") {
      setAccessToken(token);
      setIsValidToken(true);
    } else {
      // Try to get session from Supabase (in case already processed)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          setAccessToken(data.session.access_token);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      });
    }
  }, []);

  const resetPasswordMutation = useMutation<
    ResetPasswordResponse,
    Error,
    ResetPasswordRequest
  >({
    mutationFn: async (variables) => {
      const response = await fetch(
        `${API_BASE_URL}${ENDPOINTS.RESET_PASSWORD}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(variables),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success("Password reset successfully!");
      // Sign out of the short-lived recovery session — the real session
      // (if any) comes from the backend's response below instead.
      supabase.auth.signOut();

      const auth = data.data;
      if (!auth) {
        // Banned/pending accounts (or edge cases with no email) don't get
        // auto-logged in — same gating as a normal login.
        setTimeout(() => navigate(ROUTES.LOGIN), 2000);
        return;
      }

      dispatch(
        setCredentials({
          user: auth.user as any,
          token: auth.token.access_token,
        }),
      );
      Cookies.set("access_token", auth.token.access_token);
      Cookies.set("refresh_token", auth.token.refresh_token);
      Cookies.set("token_type", auth.token.token_type);
      Cookies.set("expires_in", auth.token.expires_in.toString());
      setAuthToken(auth.token.access_token);

      setTimeout(() => {
        switch (auth.user.role) {
          case UserRole.ADMIN:
            navigate(ROUTES.ADMIN_DASHBOARD);
            break;
          case UserRole.HOTEL_OWNER:
            if (auth.user.places && auth.user.places.length > 0) {
              setHotel(auth.user.places[0]);
            }
            navigate(ROUTES.HOTEL_DASHBOARD);
            break;
          default:
            navigate(ROUTES.HOME);
        }
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      resetPasswordMutation.mutate({ password: values.password });
    },
  });

  const isSuccess = resetPasswordMutation.isSuccess;

  // Loading state while checking token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center">
        <div className="text-center">
          <Hourglass className="w-12 h-12 text-brand animate-pulse mx-auto mb-4" />
          <p className="text-muted">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-bg diad-vignette flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass">
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-danger" />
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">
                Invalid or Expired Link
              </h3>
              <p className="text-muted mb-6">
                This password reset link is invalid or has expired. Please
                request a new one.
              </p>
              <Link to={ROUTES.FORGOT_PASSWORD}>
                <Button className="w-full btn-bid">Request New Link</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      {/* Full-screen explainer layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Explainer Content */}
        <div className="lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">
          <div className="max-w-lg mx-auto lg:mx-0">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 mb-8">
              <span className="text-xl font-bold text-fg">
                Death is a Deadline
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl lg:text-4xl font-bold text-fg mb-4">
              Create New Password
            </h1>
            <p className="text-lg text-muted mb-8">
              Choose a strong password that you haven't used before. Make it
              memorable but secure.
            </p>

            {/* Info Cards */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Password Requirements
                  </h3>
                  <p className="text-sm text-muted">
                    At least 6 characters. Mix letters, numbers, and symbols for
                    extra security.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">Almost There</h3>
                  <p className="text-sm text-muted">
                    Once you set your new password, you'll be signed in
                    automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="border-l-2 border-brand pl-4">
              <p className="text-muted italic">
                "A fresh start is always one password away."
              </p>
              <p className="text-sm text-muted mt-1">— The Grim Keeper</p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-1/2 flex items-center justify-center px-4 py-12 lg:py-0 bg-glass/30">
          <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-fg">
                Set New Password
              </CardTitle>
              <CardDescription className="text-center text-muted">
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-fg mb-2">
                    Password Reset!
                  </h3>
                  <p className="text-muted mb-6">
                    Your password has been successfully reset. Signing you
                    in...
                  </p>
                </div>
              ) : (
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-fg">
                      New Password
                    </Label>
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      {...formik.getFieldProps("password")}
                      className={`bg-glass border-line text-fg placeholder:text-muted ${
                        formik.touched.password && formik.errors.password
                          ? "border-danger"
                          : ""
                      }`}
                    />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-sm text-danger">
                        {formik.errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-fg">
                      Confirm New Password
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      {...formik.getFieldProps("confirmPassword")}
                      className={`bg-glass border-line text-fg placeholder:text-muted ${
                        formik.touched.confirmPassword &&
                        formik.errors.confirmPassword
                          ? "border-danger"
                          : ""
                      }`}
                    />
                    {formik.touched.confirmPassword &&
                      formik.errors.confirmPassword && (
                        <p className="text-sm text-danger">
                          {formik.errors.confirmPassword}
                        </p>
                      )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-bid"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending
                      ? "Resetting..."
                      : "Reset Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
