import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  usePlace,
  useCreatePlace,
  useUpdatePlace,
} from "../../../hooks/usePlaces";
import {
  AccommodationType,
  PlaceStatus,
  ACCOMMODATION_TYPE_LABELS,
} from "../../../types/place.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Badge } from "../../components/ui/badge";
import {
  ArrowLeft,
  Upload,
  X,
  Calendar as CalendarIcon,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { cn } from "../../components/ui/utils";
import { placeValidationSchema } from "../../../utils/validationSchemas";
import { supabase } from "../../../utils/supabaseClient";
import { toast } from "sonner";
import { SUPABASE_BUCKET } from "../../../lib/constants";
import { LocationPicker } from "../../components/common/LocationPicker";

// Upload images to Supabase and return URLs
const uploadImagesToSupabase = async (files: File[]): Promise<string[]> => {
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop();
    const fileName = `place_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(`places/${fileName}`, file);

    if (error) {
      console.error("Error uploading image:", error);
      toast.error(`Failed to upload ${file.name}`);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(`places/${fileName}`);

    if (publicUrlData?.publicUrl) {
      urls.push(publicUrlData.publicUrl);
    }
  }

  return urls;
};

export function PlaceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data, isLoading: isLoadingPlace } = usePlace(id || "");
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const existingPlace = data?.place;

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: existingPlace?.name || "",
      shortDescription: existingPlace?.shortDescription || "",
      fullDescription: existingPlace?.fullDescription || "",
      city: existingPlace?.city || "",
      country: existingPlace?.country || "",
      address: existingPlace?.address || "",
      email: existingPlace?.email || "",
      latitude: existingPlace?.latitude ?? null,
      longitude: existingPlace?.longitude ?? null,
      images: [] as File[],
      accommodationType:
        existingPlace?.accommodationType || ("" as AccommodationType),
      retailPrice: existingPlace?.retailPrice || 0,
      minimumBid: existingPlace?.minimumBid || 0,
      autoAcceptAboveMinimum: existingPlace?.autoAcceptAboveMinimum ?? true,
      status: existingPlace?.status || PlaceStatus.DRAFT,
    },
    enableReinitialize: true,
    validationSchema: placeValidationSchema,
    onSubmit: async (values) => {
      try {
        setIsUploading(true);

        // Upload new images to Supabase first
        let imageUrls: string[] = [];

        if (values.images.length > 0) {
          imageUrls = await uploadImagesToSupabase(values.images);
        }

        // Combine existing URLs (for edit mode) with new uploads
        const allImageUrls = [...existingImageUrls, ...imageUrls];

        if (allImageUrls.length === 0) {
          toast.error("At least one image is required");
          setIsUploading(false);
          return;
        }

        const data = {
          ...values,
          blackoutDates: blackoutDates.map(
            (d) => d.toISOString().split("T")[0],
          ),
          imageUrls: allImageUrls,
        };

        if (isEditMode && id) {
          await updatePlace.mutateAsync({ ...data, id });
        } else {
          await createPlace.mutateAsync(data);
        }

        navigate(ROUTES.ADMIN_PLACES);
      } catch (error) {
        console.error("Error submitting form:", error);
      } finally {
        setIsUploading(false);
      }
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingPlace && isEditMode) {
      const existingUrls = existingPlace.images.map((img) => img.url);
      setExistingImageUrls(existingUrls);
      setImagePreviews(existingUrls);
      setBlackoutDates(existingPlace.blackoutDates.map((d) => new Date(d)));
    }
  }, [existingPlace, isEditMode]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    formik.setFieldValue("images", [...formik.values.images, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // Check if this is an existing image URL or a new file
    if (index < existingImageUrls.length) {
      // Remove from existing URLs
      const newExistingUrls = [...existingImageUrls];
      newExistingUrls.splice(index, 1);
      setExistingImageUrls(newExistingUrls);
    } else {
      // Remove from new files
      const fileIndex = index - existingImageUrls.length;
      const newImages = [...formik.values.images];
      newImages.splice(fileIndex, 1);
      formik.setFieldValue("images", newImages);
    }

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateExists = blackoutDates.some(
      (d) => d.toISOString().split("T")[0] === date.toISOString().split("T")[0],
    );

    if (dateExists) {
      setBlackoutDates(
        blackoutDates.filter(
          (d) =>
            d.toISOString().split("T")[0] !== date.toISOString().split("T")[0],
        ),
      );
    } else {
      setBlackoutDates([...blackoutDates, date]);
    }
  };

  if (isEditMode && isLoadingPlace) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <SkeletonLoader className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.ADMIN_PLACES)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-fg">
          {isEditMode ? "Edit Place" : "Add New Place"}
        </h1>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Basic Information</CardTitle>
            <CardDescription className="text-muted">
              Enter the core details about the place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-fg">
                Place Name *
              </Label>
              <Input
                id="name"
                {...formik.getFieldProps("name")}
                placeholder="e.g., Downtown Student Hub"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-sm text-error mt-1">{formik.errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shortDescription" className="text-fg">
                Short Description *
              </Label>
              <Input
                id="shortDescription"
                {...formik.getFieldProps("shortDescription")}
                placeholder="Brief tagline (max 100 characters)"
                maxLength={100}
              />
              {formik.touched.shortDescription &&
                formik.errors.shortDescription && (
                  <p className="text-sm text-error mt-1">
                    {formik.errors.shortDescription}
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="fullDescription" className="text-fg">
                Full Description *
              </Label>
              <Textarea
                id="fullDescription"
                {...formik.getFieldProps("fullDescription")}
                placeholder="Detailed description of the place and its amenities"
                rows={6}
              />
              {formik.touched.fullDescription &&
                formik.errors.fullDescription && (
                  <p className="text-sm text-error mt-1">
                    {formik.errors.fullDescription}
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="email" className="text-fg">
                Place Email (for notifications)
              </Label>
              <Input
                id="email"
                type="email"
                {...formik.getFieldProps("email")}
                placeholder="e.g., contact@place.com"
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-sm text-error mt-1">{formik.errors.email}</p>
              )}
              <p className="text-sm text-muted mt-1">
                Booking confirmations will be sent to this email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Location</CardTitle>
            <CardDescription className="text-muted">
              Search or click on the map to set the place location. City,
              country, and address will be auto-populated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5 mb-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-fg">
                    City *
                  </Label>
                  <Input
                    id="city"
                    {...formik.getFieldProps("city")}
                    placeholder="e.g., New York"
                    disabled
                    className="bg-white/5 border-white/10"
                  />
                  {formik.touched.city && formik.errors.city && (
                    <p className="text-sm text-error mt-1">
                      {formik.errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country" className="text-fg">
                    Country *
                  </Label>
                  <Input
                    id="country"
                    {...formik.getFieldProps("country")}
                    placeholder="e.g., USA"
                    disabled
                    className="bg-white/5 border-white/10"
                  />
                  {formik.touched.country && formik.errors.country && (
                    <p className="text-sm text-error mt-1">
                      {formik.errors.country}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-fg">
                  Address *
                </Label>
                <Input
                  id="address"
                  {...formik.getFieldProps("address")}
                  placeholder="Full street address"
                  className="bg-white/5 border-white/10"
                />
                {formik.touched.address && formik.errors.address && (
                  <p className="text-sm text-error mt-1">
                    {formik.errors.address}
                  </p>
                )}
              </div>
            </div>

            <LocationPicker
              latitude={formik.values.latitude}
              longitude={formik.values.longitude}
              onLocationChange={(location) => {
                formik.setFieldValue("latitude", location.latitude);
                formik.setFieldValue("longitude", location.longitude);
                if (location.city) {
                  formik.setFieldValue("city", location.city);
                }
                if (location.country) {
                  formik.setFieldValue("country", location.country);
                }
                if (location.address) {
                  formik.setFieldValue("address", location.address);
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Media */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Media</CardTitle>
            <CardDescription className="text-muted">
              Upload images of the place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images" className="text-fg">
                Images
              </Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-brand hover:bg-white/5 transition-colors">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted" />
                    <p className="mt-2 text-sm text-muted">
                      Click to upload images
                    </p>
                  </div>
                  <input
                    id="images"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accommodation Type */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Accommodation Type</CardTitle>
            <CardDescription className="text-muted">
              Select the type of accommodation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="accommodationType" className="text-fg">
              Type *
            </Label>
            <Select
              value={formik.values.accommodationType}
              onValueChange={(value) =>
                formik.setFieldValue("accommodationType", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select accommodation type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOMMODATION_TYPE_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {formik.touched.accommodationType &&
              formik.errors.accommodationType && (
                <p className="text-sm text-error mt-1">
                  {formik.errors.accommodationType}
                </p>
              )}
          </CardContent>
        </Card>

        {/* Pricing & Bidding Rules */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Pricing & Bidding Rules</CardTitle>
            <CardDescription className="text-muted">
              Set pricing and bidding parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retailPrice" className="text-fg">
                  Retail Price (per night) *
                </Label>
                <Input
                  id="retailPrice"
                  type="number"
                  {...formik.getFieldProps("retailPrice")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {formik.touched.retailPrice && formik.errors.retailPrice && (
                  <p className="text-sm text-error mt-1">
                    {formik.errors.retailPrice}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="minimumBid" className="text-fg">
                  Minimum Acceptable Bid (per night) *
                </Label>
                <Input
                  id="minimumBid"
                  type="number"
                  {...formik.getFieldProps("minimumBid")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {formik.touched.minimumBid && formik.errors.minimumBid && (
                  <p className="text-sm text-error mt-1">
                    {formik.errors.minimumBid}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-fg">
                  Auto-accept bids above minimum
                </Label>
                <p className="text-sm text-muted">
                  Automatically accept bids that meet or exceed the minimum bid
                </p>
              </div>
              <Switch
                checked={formik.values.autoAcceptAboveMinimum}
                onCheckedChange={(checked) =>
                  formik.setFieldValue("autoAcceptAboveMinimum", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Availability Rules */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Availability Rules</CardTitle>
            <CardDescription className="text-muted">
              Note: Bids are only allowed 0-30 days from today. Set blackout
              dates below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-fg">Blackout Dates</Label>
              <p className="text-sm text-muted mb-2">
                Select dates when bookings are not available
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {blackoutDates.length > 0
                      ? `${blackoutDates.length} date(s) selected`
                      : "Select blackout dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto bg-bg p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={blackoutDates}
                    onSelect={(dates) => setBlackoutDates(dates || [])}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {blackoutDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blackoutDates.map((date, index) => (
                  <Badge key={index} variant="secondary">
                    {format(date, "MMM dd, yyyy")}
                    <button
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      className="ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="glass-2 border-white/10">
          <CardHeader>
            <CardTitle className="text-fg">Publication Status</CardTitle>
            <CardDescription className="text-muted">
              Control the visibility of this place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="status" className="text-fg">
              Status
            </Label>
            <Select
              value={formik.values.status}
              onValueChange={(value) =>
                formik.setFieldValue("status", value as PlaceStatus)
              }
            >
              <SelectTrigger className="text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PlaceStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={PlaceStatus.LIVE}>Live</SelectItem>
                <SelectItem value={PlaceStatus.PAUSED}>Paused</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="sticky bottom-[-25px] bg-bg border-t border-white/10 p-4 flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.ADMIN_PLACES)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              createPlace.isPending || updatePlace.isPending || isUploading
            }
          >
            <Save className="mr-2 h-4 w-4" />
            {isUploading
              ? "Uploading images..."
              : createPlace.isPending || updatePlace.isPending
                ? "Saving..."
                : isEditMode
                  ? "Update Place"
                  : "Create Place"}
          </Button>
        </div>
      </form>
    </div>
  );
}
