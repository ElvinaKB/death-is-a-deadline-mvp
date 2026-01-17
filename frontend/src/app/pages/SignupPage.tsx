import { useState, useRef, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useFormik } from "formik";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { signupSchema } from "../../utils/validationSchemas";
import { getFieldError } from "../../utils/formikHelpers";
import { isAcademicEmail } from "../../utils/emailValidator";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { ROUTES } from "../../config/routes.config";
import {
  SignupRequest,
  AuthResponse,
  ApprovalStatus,
} from "../../types/auth.types";
import { useAppDispatch } from "../../store/hooks";
import { setCredentials } from "../../store/slices/authSlice";
import { setAuthToken } from "../../utils/tokenHelpers";
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
import { Alert, AlertDescription } from "../components/ui/alert";
import { PendingApprovalAlert } from "../components/common/PendingApprovalAlert";
import { Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SUPABASE_BUCKET } from "../../lib/constants";
import { useDebounce } from "../../hooks/useDebounce";

interface LocationState {
  returnUrl?: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
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
      const isApproved = data?.user?.approvalStatus !== ApprovalStatus.APPROVED;
      const notApproved =
        "NOTE: If you are a student with an academic email, you will be logged in automatically once your email is verified.";
      toast.success(
        "Account created successfully! Verify your email to continue." +
          (isApproved ? notApproved : "")
      );
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
      "_"
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

  const isPending =
    signupMutation.isSuccess &&
    signupMutation.data?.user?.approvalStatus === ApprovalStatus.PENDING;

  const isImageUploaded = !!needsIdUpload ? !!selectedFile : true;
  const emailDebounced = useDebounce(formik.values.email, 300);

  // Check if email needs ID upload
  useEffect(() => {
    const handleEmailBlur = () => {
      if (emailDebounced && !isAcademicEmail(emailDebounced)) {
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
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4 diad-vignette">
      <Card className="w-full max-w-md bg-glass-2 border-line shadow-glass relative z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-fg">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-muted">
            Sign up to start bidding on student accommodations
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
              <Label htmlFor="name" className="text-fg">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...formik.getFieldProps("name")}
                className={`bg-glass border-line text-fg placeholder:text-muted ${
                  getFieldError("name", formik) ? "border-danger" : ""
                }`}
              />
              {getFieldError("name", formik) && (
                <p className="text-sm text-danger">
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
                {...formik.getFieldProps("email")}
                onBlur={(e) => {
                  formik.handleBlur(e);
                }}
                className={`bg-glass border-line text-fg placeholder:text-muted ${
                  getFieldError("email", formik) ? "border-danger" : ""
                }`}
              />
              {getFieldError("email", formik) && (
                <p className="text-sm text-danger">
                  {getFieldError("email", formik)}
                </p>
              )}
              {formik.values.email && !getFieldError("email", formik) && (
                <>
                  {isAcademicEmail(formik.values.email) ? (
                    <Alert className="border-success/30 bg-success/10">
                      <AlertDescription className="text-success text-sm">
                        Academic email detected. Your account will be approved
                        automatically.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-brand/30 bg-brand/10">
                      <AlertCircle className="h-4 w-4 text-brand" />
                      <AlertDescription className="text-brand-2 text-sm">
                        Non-academic email. Please upload your student ID card
                        for verification.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            {needsIdUpload && (
              <div className="space-y-2">
                <Label htmlFor="studentIdCard" className="text-fg">
                  Student ID Card
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-line rounded-lg p-6 text-center cursor-pointer hover:border-brand transition-colors bg-glass"
                >
                  {selectedFile ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Student ID Card"
                      className="h-full w-full"
                    />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted" />
                      <p className="text-sm text-muted">
                        {"Click to upload student ID card"}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="studentIdCard"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {getFieldError("studentIdCard", formik) && (
                  <p className="text-sm text-danger">
                    {getFieldError("studentIdCard", formik)}
                  </p>
                )}
              </div>
            )}

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
                  getFieldError("confirmPassword", formik)
                    ? "border-danger"
                    : ""
                }`}
              />
              {getFieldError("confirmPassword", formik) && (
                <p className="text-sm text-danger">
                  {getFieldError("confirmPassword", formik)}
                </p>
              )}
            </div>

            <Button
              type={!isImageUploaded ? "button" : "submit"}
              className="w-full btn-bid"
              disabled={
                signupMutation.isPending ||
                isPending ||
                !isImageUploaded ||
                fileUpload
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
  );
}
