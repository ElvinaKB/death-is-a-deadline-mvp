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
        setCredentials({ user: data.user, token: data.token.access_token })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...formik.getFieldProps("email")}
                className={
                  getFieldError("email", formik) ? "border-red-500" : ""
                }
              />
              {getFieldError("email", formik) && (
                <p className="text-sm text-red-500">
                  {getFieldError("email", formik)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...formik.getFieldProps("password")}
                className={
                  getFieldError("password", formik) ? "border-red-500" : ""
                }
              />
              {getFieldError("password", formik) && (
                <p className="text-sm text-red-500">
                  {getFieldError("password", formik)}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={(loginMutation.isPending || isPending) && !formik.dirty}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link
              to={ROUTES.SIGNUP}
              state={returnUrl ? { returnUrl } : undefined}
              className="text-blue-600 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
