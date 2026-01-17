import { useFormik } from "formik";
import { Link } from "react-router-dom";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
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
import { toast } from "sonner";
import { Hourglass, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import * as Yup from "yup";

const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

export function ForgotPasswordPage() {
  const forgotPasswordMutation = useApiMutation<
    ForgotPasswordResponse,
    ForgotPasswordRequest
  >({
    endpoint: ENDPOINTS.FORGOT_PASSWORD,
    onSuccess: () => {
      toast.success("Password reset email sent! Check your inbox.");
    },
  });

  const formik = useFormik<ForgotPasswordRequest>({
    initialValues: {
      email: "",
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: (values) => {
      forgotPasswordMutation.mutate(values);
    },
  });

  const isSuccess = forgotPasswordMutation.isSuccess;

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      {/* Full-screen explainer layout */}
      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
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
              Forgot Your Password?
            </h1>
            <p className="text-lg text-muted mb-8">
              No worries — it happens to the best of us. Enter your email and
              we'll send you a link to reset your password.
            </p>

            {/* Info Cards */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">
                    Check Your Email
                  </h3>
                  <p className="text-sm text-muted">
                    We'll send a secure link to your registered email address.
                    Click it to create a new password.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-1">Quick & Secure</h3>
                  <p className="text-sm text-muted">
                    The reset link expires in 1 hour for your security. You'll
                    be back to bidding in no time.
                  </p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="border-l-2 border-brand pl-4">
              <p className="text-muted italic">
                "Even the dead forget sometimes. But we remember our deals."
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
                Reset Password
              </CardTitle>
              <CardDescription className="text-center text-muted">
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-fg mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-muted mb-6">
                    We've sent a password reset link to{" "}
                    <span className="text-fg font-medium">
                      {formik.values.email}
                    </span>
                  </p>
                  <p className="text-sm text-muted mb-6">
                    Didn't receive the email? Check your spam folder or try
                    again.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      forgotPasswordMutation.reset();
                      formik.resetForm();
                    }}
                  >
                    Try Another Email
                  </Button>
                </div>
              ) : (
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-fg">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@university.edu"
                      {...formik.getFieldProps("email")}
                      className={`bg-glass border-line text-fg placeholder:text-muted ${
                        formik.touched.email && formik.errors.email
                          ? "border-danger"
                          : ""
                      }`}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <p className="text-sm text-danger">
                        {formik.errors.email}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-bid"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending
                      ? "Sending..."
                      : "Send Reset Link"}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-brand hover:underline font-medium inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
