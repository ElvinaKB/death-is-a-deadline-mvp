import { useRef, useState } from "react";
import { useFormik } from "formik";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import * as Yup from "yup";
import { useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { ROUTES } from "../../../config/routes.config";
import { AuthResponse } from "../../../types/auth.types";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/slices/authSlice";
import { setAuthToken } from "../../../utils/tokenHelpers";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useHotel } from "../../../hooks/useHotel";

interface HotelSignupRequest {
  name: string;
  password: string;
  confirmPassword: string;
  token: string;
}

const hotelSignupSchema = Yup.object({
  name: Yup.string().required("Full name is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

export function HotelSignupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { setHotel } = useHotel();

  const signupMutation = useApiMutation<AuthResponse, HotelSignupRequest>({
    endpoint: ENDPOINTS.HOTEL_SIGNUP, // e.g. POST /signup/hotel
    showErrorToast: true,
    onSuccess: (data) => {
      if (data?.token) setAuthToken(data.token.access_token);
      if (data?.user) {
        dispatch(
          setCredentials({ user: data.user, token: data.token.access_token }),
        );
        // Auto-select first hotel after signup
        if (data.user.places && data.user.places.length > 0) {
          setHotel(data.user.places[0]);
        }
      }
      toast.success("Welcome! Your hotel account is ready.");
      navigate(ROUTES.HOTEL_DASHBOARD, { replace: true });
    },
  });

  const formik = useFormik<Omit<HotelSignupRequest, "token">>({
    initialValues: { name: "", password: "", confirmPassword: "" },
    validationSchema: hotelSignupSchema,
    onSubmit: (values) => {
      if (!token) return;
      signupMutation.mutate({ ...values, token });
    },
  });

  // Invalid / missing token guard
  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-glass-2 border-line">
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-danger mx-auto" />
            <h2 className="text-lg font-semibold text-fg">
              Invalid Invite Link
            </h2>
            <p className="text-sm text-muted">
              This link is missing a valid token. Please check the email you
              received or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        {/* Left — explainer */}
        <div className="lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">
          <div className="max-w-lg mx-auto lg:mx-0">
            <div className="flex items-center gap-2 mb-8">
              <Link to={ROUTES.HOME} className="text-xl font-bold text-fg">
                Death is a Deadline
              </Link>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-fg mb-4">
              Set Up Your Hotel Account
            </h1>
            <p className="text-lg text-muted mb-10">
              You've been invited to list your property on our platform. Create
              your account to start managing bookings and payouts.
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Your Property, Your Control
                  </h3>
                  <p className="text-sm text-muted">
                    Manage availability, set minimum bids, and block dates — all
                    from one dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Verified Student Guests
                  </h3>
                  <p className="text-sm text-muted">
                    Every booking comes from a verified student. No fraud, no
                    surprises.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    One-Time Invite
                  </h3>
                  <p className="text-sm text-muted">
                    This link was sent specifically to you. Once you create your
                    account, it won't be usable again.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-2 border-brand pl-4">
              <p className="text-muted italic">
                "Checkout is never guaranteed."
              </p>
              <p className="text-sm text-muted mt-1">— The Grim Keeper</p>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:w-1/2 flex items-center justify-center px-4 py-12 lg:py-0 bg-glass/30">
          <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-fg">
                Create Hotel Account
              </CardTitle>
              <CardDescription className="text-center text-muted">
                Complete your profile to activate your listing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signupMutation.isError && (
                <Alert className="border-danger/30 bg-danger/10 mb-4">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <AlertDescription className="text-danger text-sm">
                    This invite link may have already been used or has expired.
                    Please contact support.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={formik.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-fg">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Smith"
                    {...formik.getFieldProps("name")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      formik.touched.name && formik.errors.name
                        ? "border-danger"
                        : ""
                    }`}
                  />
                  {formik.touched.name && formik.errors.name && (
                    <p className="text-sm text-danger">{formik.errors.name}</p>
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
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
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
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending
                    ? "Creating account..."
                    : "Create Account & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
