import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useApiMutation } from "../../hooks/useApi";
import { ENDPOINTS } from "../../config/endpoints.config";
import { SUPABASE_BUCKET } from "../../lib/constants";
import { supabase } from "../../utils/supabaseClient";
import { apiClient } from "../../lib/apiClient";

export function ResubmitPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUpload, setFileUpload] = useState<boolean>(false);

  // Extract token from query params
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  const resubmitMutation = useApiMutation({
    endpoint: ENDPOINTS.RESUBMIT_ID,
    showErrorToast: true,
    onSuccess: () => {
      toast.success("ID resubmitted successfully! Please wait for review.");
      navigate("/login");
    },
  });

  const formik = useFormik({
    initialValues: {
      studentIdCard: undefined,
    } as { studentIdCard: File | undefined },
    validate: (values) => {
      const errors: any = {};
      if (!values.studentIdCard) {
        errors.studentIdCard = "Student ID card is required";
      }
      return errors;
    },
    onSubmit: async (values) => {
      if (!token) {
        toast.error("Invalid or missing token");
        return;
      }
      let studentIdUrl = await handleFileUpload();
      resubmitMutation.mutate({ token, studentIdUrl });
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
    const file = formik.values.studentIdCard;
    if (!file) {
      setFileUpload(false);
      return toast.error("No file selected");
    }
    if (!token) {
      setFileUpload(false);
      return toast.error("Invalid or missing token");
    }

    const ext = (file.name ? file.name.split(".").pop() : "jpg") || "jpg";
    try {
      const { path, token: uploadToken } = await apiClient.post<{
        path: string;
        token: string;
      }>(ENDPOINTS.ID_UPLOAD_URL, {
        context: "resubmit",
        token,
        fileExt: ext.toLowerCase(),
      });
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .uploadToSignedUrl(path, uploadToken, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(path);
      return publicUrlData?.publicUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload student ID card");
      throw error;
    } finally {
      setFileUpload(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <Card className="w-full max-w-md glass-2 border-white/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-fg">
            Resubmit Student ID
          </CardTitle>
          <CardDescription className="text-center text-muted">
            Please upload your student ID card for verification. The link will
            expire in 1 day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentIdCard" className="text-fg">
                Student ID Card
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand transition-colors bg-white/5"
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
                    <p className="text-xs text-muted/70 mt-1">
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
              {formik.errors.studentIdCard && (
                <p className="text-sm text-red-500">
                  {formik.errors.studentIdCard}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resubmitMutation.isPending || fileUpload}
            >
              {resubmitMutation.isPending || fileUpload
                ? "Submitting..."
                : "Resubmit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
