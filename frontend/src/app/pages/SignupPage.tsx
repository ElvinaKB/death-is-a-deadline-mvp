import { useState, useRef, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useFormik } from "formik";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { signupSchema } from "../../utils/validationSchemas";
import { getFieldError, getFieldDescribedBy, getFieldErrorId } from "../../utils/formikHelpers";
import { isAutoVerifiedEmail } from "../../utils/emailValidator";
import { ANALYTICS_EVENTS, trackEvent } from "../../utils/analytics";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import { SignupRequest, AuthResponse } from "../../types/auth.types";
import { API_BASE_URL } from "../../lib/apiClient";
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
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Upload,
  AlertCircle,
  GraduationCap,
  Shield,
  DollarSign,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { SUPABASE_BUCKET } from "../../lib/constants";
import { useDebounce } from "../../hooks/useDebounce";

interface LocationState {
  returnUrl?: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [needsIdUpload, setNeedsIdUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUpload, setFileUpload] = useState<boolean>(false);

  // Get return URL from location state
  const locationState = location.state as LocationState | null;
  const returnUrl = locationState?.returnUrl;

  const signupMutation = useApiMutation<AuthResponse, SignupRequest>({
    endpoint: ENDPOINTS.SIGNUP,
    showErrorToast: true,
    onSuccess: (data) => {
      trackEvent(ANALYTICS_EVENTS.SIGNUP_COMPLETED);
      navigate(ROUTES.SIGNUP_SUCCESS, {
        state: { email: data?.user?.email ?? formik.values.email },
      });
    },
  });

  const formik = useFormik<SignupRequest>({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      studentIdCard: undefined,
    },
    validationSchema: signupSchema,
    onSubmit: async (values) => {
      let studentIdUrl = values.studentIdCard ? await handleFileUpload() : "";

      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        studentIdUrl,
      };
      signupMutation.mutate(payload);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      formik.setFieldValue("studentIdCard", file);
    }
  };

  const handleFileUpload = async () => {
    setFileUpload(true);
    // Upload file to Supabase Storage
    const file = formik.values.studentIdCard;
    // Get file extension
    const ext = file && file.name ? file.name.split(".").pop() : "";
    const fileName = `${formik.values.email.replace(
      /[^a-zA-Z0-9]/g,
      "_",
    )}_${Date.now()}${ext ? `.${ext}` : ""}`;
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, file as any);
    if (error) {
      setFileUpload(false);
      console.log(error);
      toast.error(error.message || "Failed to upload student ID card");
      throw error;
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);
    setFileUpload(false);
    return publicUrlData?.publicUrl;
  };

  const isImageUploaded = !!needsIdUpload ? !!selectedFile : true;
  const emailDebounced = useDebounce(formik.values.email, 300);

  // Check if email needs ID upload
  useEffect(() => {
    const handleEmailBlur = () => {
      if (emailDebounced && !isAutoVerifiedEmail(emailDebounced)) {
        setNeedsIdUpload(true);
      } else {
        setNeedsIdUpload(false);
        setSelectedFile(null);
        formik.setFieldValue("studentIdCard", undefined);
      }
    };

    handleEmailBlur();
  }, [emailDebounced]);

  return (
    <div className="min-h-screen bg-bg diad-vignette">
      {/* Mobile: form first; desktop: benefits / video / form */}
      <main id="main-content" className="flex flex-col lg:flex-row min-h-screen" tabIndex={-1}>
        {/* Why create an account — below form/video on mobile */}
        <div className="order-3 lg:order-1 lg:w-[38%] flex flex-col justify-start px-4 sm:px-8 lg:pl-16 lg:pr-8 pt-8 lg:pt-16 pb-16">
          <div className="max-w-lg mx-auto lg:mx-0">
            <Link to={ROUTES.HOME} className="inline-block mb-6">
              <span className="font-serif text-lg sm:text-xl tracking-[0.14em] text-gold leading-none">
                DEADLINE
              </span>
            </Link>

            <h1 className="text-3xl lg:text-4xl font-bold text-fg mb-4">
              Why Create an Account?
            </h1>
            <p className="text-lg text-muted">
              We verify travelers to unlock exclusive hotel rates that aren't
              available anywhere else.
            </p>
          </div>

          <div className="max-w-lg w-full mx-auto lg:mx-0 mt-8 divide-y divide-line">
            <div className="flex items-start gap-4 py-8 first:pt-0">
              <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-1">
                  Verified Travelers Only
                </h3>
                <p className="text-sm text-muted">
                  Exclusive marketplace access
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-1">
                  No Risk Bidding
                </h3>
                <p className="text-sm text-muted">
                  Instant decisions. No charge for low bids
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 py-8 last:pb-0">
              <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-1">
                  Curated Marketplace
                </h3>
                <p className="text-sm text-muted">Hyperlocal Indie hotels</p>
              </div>
            </div>
          </div>
        </div>

        {/* Video — between benefits and form on desktop, second on mobile */}
        <div className="order-2 lg:order-2 lg:w-[27%] flex items-start justify-center px-4 py-6 lg:pt-16">
          <div className="w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden border border-line bg-glass shadow-glass">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/QuKxi1AETqc"
              title="How Deadline works"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Signup form — first on mobile */}
        <div className="order-1 lg:order-3 lg:w-[35%] flex items-start justify-center px-4 py-8 sm:py-10 lg:pt-16 lg:pb-10 bg-glass/30">
          <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-fg">
                Create Account
              </CardTitle>
              <CardDescription className="text-center text-muted">
                Sign up to continue bidding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={formik.handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-fg">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    aria-invalid={!!getFieldError("name", formik)}
                    aria-describedby={getFieldDescribedBy("name", formik)}
                    {...formik.getFieldProps("name")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("name", formik) ? "border-danger" : ""
                    }`}
                  />
                  {getFieldError("name", formik) && (
                    <p
                      id={getFieldErrorId("name")}
                      className="text-sm text-danger"
                      role="alert"
                    >
                      {getFieldError("name", formik)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-fg">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    autoComplete="email"
                    aria-invalid={!!getFieldError("email", formik)}
                    aria-describedby={getFieldDescribedBy("email", formik)}
                    {...formik.getFieldProps("email")}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                    }}
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
                  {formik.values.email && !getFieldError("email", formik) && (
                    <>
                      {isAutoVerifiedEmail(formik.values.email) ? (
                        <Alert className="border-success/30 bg-success/10">
                          <AlertDescription className="text-success text-sm">
                            Verified email domain detected. Your account will
                            be approved automatically.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-brand/30 bg-brand/10">
                          <AlertCircle className="h-4 w-4 text-brand" />
                          <AlertDescription className="text-brand-2 text-sm">
                            Instantly verify with .edu, .gov, and approved
                            partner organizations. Others need manual
                            verification — please upload your ID card, or
                            sign in with LinkedIn below for instant approval.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-line bg-glass"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (returnUrl) params.set("returnUrl", returnUrl);
                      window.location.href = `${API_BASE_URL}${ENDPOINTS.LINKEDIN_AUTHORIZE}${
                        params.toString() ? `?${params}` : ""
                      }`;
                    }}
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    Sign in with LinkedIn — skip ID upload
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <div className="flex-1 h-px bg-line" />
                    or continue below
                    <div className="flex-1 h-px bg-line" />
                  </div>
                </div>

                {needsIdUpload && (
                  <div className="space-y-2">
                    <Label htmlFor="studentIdCard" className="text-fg">
                      Government ID
                    </Label>
                    <label
                      htmlFor="studentIdCard"
                      className="border-2 border-dashed border-line rounded-lg p-6 text-center cursor-pointer hover:border-brand transition-colors bg-glass block"
                    >
                      {selectedFile ? (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview of uploaded government ID"
                          className="h-full w-full max-h-48 object-contain mx-auto"
                        />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted" aria-hidden />
                          <p className="text-sm text-muted">
                            Click or press Enter to upload government ID
                          </p>
                          <p className="text-xs text-muted mt-1">
                            PNG, JPG up to 5MB
                          </p>
                        </>
                      )}
                    </label>
                    <input
                      ref={fileInputRef}
                      id="studentIdCard"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                      aria-invalid={!!getFieldError("studentIdCard", formik)}
                      aria-describedby={getFieldDescribedBy(
                        "studentIdCard",
                        formik,
                      )}
                    />
                    {getFieldError("studentIdCard", formik) && (
                      <p
                        id={getFieldErrorId("studentIdCard")}
                        className="text-sm text-danger"
                        role="alert"
                      >
                        {getFieldError("studentIdCard", formik)}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-fg">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-fg">
                    Confirm Password
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!getFieldError("confirmPassword", formik)}
                    aria-describedby={getFieldDescribedBy(
                      "confirmPassword",
                      formik,
                    )}
                    {...formik.getFieldProps("confirmPassword")}
                    className={`bg-glass border-line text-fg placeholder:text-muted ${
                      getFieldError("confirmPassword", formik)
                        ? "border-danger"
                        : ""
                    }`}
                  />
                  {getFieldError("confirmPassword", formik) && (
                    <p
                      id={getFieldErrorId("confirmPassword")}
                      className="text-sm text-danger"
                      role="alert"
                    >
                      {getFieldError("confirmPassword", formik)}
                    </p>
                  )}
                </div>

                <Button
                  type={!isImageUploaded ? "button" : "submit"}
                  className="w-full btn-bid"
                  disabled={
                    signupMutation.isPending || !isImageUploaded || fileUpload
                  }
                >
                  {signupMutation.isPending || fileUpload
                    ? "Creating account..."
                    : "Sign Up"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted">Already have an account? </span>
                <Link
                  to={ROUTES.LOGIN}
                  state={returnUrl ? { returnUrl } : undefined}
                  className="text-brand hover:underline font-medium"
                >
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
