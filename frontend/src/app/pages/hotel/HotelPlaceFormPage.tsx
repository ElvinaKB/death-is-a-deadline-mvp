import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { usePlace, useUpdatePlace } from "../../../hooks/usePlaces";
import { ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";
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
import { Checkbox } from "../../components/ui/checkbox";
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
  MapPin,
  Mail,
  Building2,
  DollarSign,
  Tag,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "../../../config/routes.config";
import { SkeletonLoader } from "../../components/common/SkeletonLoader";
import { cn } from "../../components/ui/utils";
import { supabase } from "../../../utils/supabaseClient";
import { toast } from "sonner";
import { SUPABASE_BUCKET } from "../../../lib/constants";
import { useAppSelector } from "../../../store/hooks";

const uploadImagesToSupabase = async (files: File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop();
    const fileName = `place_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(`places/${fileName}`, file);
    if (error) {
      toast.error(`Failed to upload ${file.name}`);
      continue;
    }
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(`places/${fileName}`);
    if (publicUrlData?.publicUrl) urls.push(publicUrlData.publicUrl);
  }
  return urls;
};

const hotelFormSchema = Yup.object({
  name: Yup.string().required("Place name is required"),
  shortDescription: Yup.string()
    .max(100)
    .required("Short description is required"),
  fullDescription: Yup.string().required("Full description is required"),
  maxInventory: Yup.number()
    .min(1, "At least 1 room/bed required")
    .required("Required"),
  minimumBid: Yup.number().min(0, "Cannot be negative").required("Required"),
});

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function HotelPlaceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = usePlace(id || "");
  const updatePlace = useUpdatePlace();
  const existingPlace = data?.place;

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [allowedDaysOfWeek, setAllowedDaysOfWeek] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6,
  ]);
  const [isUploading, setIsUploading] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: existingPlace?.name || "",
      shortDescription: existingPlace?.shortDescription || "",
      fullDescription: existingPlace?.fullDescription || "",
      maxInventory: existingPlace?.maxInventory || 1,
      minimumBid: existingPlace?.minimumBid || 0,
      images: [] as File[],
    },
    enableReinitialize: true,
    validationSchema: hotelFormSchema,
    onSubmit: async (values) => {
      if (!id) return;
      try {
        setIsUploading(true);
        let imageUrls: string[] = [];
        if (values.images.length > 0) {
          imageUrls = await uploadImagesToSupabase(values.images);
        }
        const allImageUrls = [...existingImageUrls, ...imageUrls];
        if (allImageUrls.length === 0) {
          toast.error("At least one image is required");
          return;
        }
        await updatePlace.mutateAsync({
          id,
          name: values.name,
          shortDescription: values.shortDescription,
          fullDescription: values.fullDescription,
          maxInventory: values.maxInventory,
          minimumBid: values.minimumBid,
          blackoutDates: blackoutDates.map(
            (d) => d.toISOString().split("T")[0],
          ),
          allowedDaysOfWeek,
          imageUrls: allImageUrls,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
  });

  useEffect(() => {
    if (existingPlace) {
      const existingUrls = (existingPlace.images as { url: string }[]).map(
        (img) => img.url,
      );
      setExistingImageUrls(existingUrls);
      setImagePreviews(existingUrls);
      setBlackoutDates(existingPlace.blackoutDates.map((d) => new Date(d)));
      setAllowedDaysOfWeek(
        existingPlace.allowedDaysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      );
    }
  }, [existingPlace]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    formik.setFieldValue("images", [...formik.values.images, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    if (index < existingImageUrls.length) {
      const updated = [...existingImageUrls];
      updated.splice(index, 1);
      setExistingImageUrls(updated);
    } else {
      const fileIndex = index - existingImageUrls.length;
      const updated = [...formik.values.images];
      updated.splice(fileIndex, 1);
      formik.setFieldValue("images", updated);
    }
    const updated = [...imagePreviews];
    updated.splice(index, 1);
    setImagePreviews(updated);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const key = date.toISOString().split("T")[0];
    const exists = blackoutDates.some(
      (d) => d.toISOString().split("T")[0] === key,
    );
    setBlackoutDates(
      exists
        ? blackoutDates.filter((d) => d.toISOString().split("T")[0] !== key)
        : [...blackoutDates, date],
    );
  };

  if (isLoading) {
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.HOTEL_PLACES)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-fg">
            Manage Property
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Update your listing details and availability
          </p>
        </div>
      </div>

      {/* Read-only property details card */}
      {existingPlace && (
        <Card className="glass-2 border-line bg-glass">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted" />
              <CardTitle className="text-sm sm:text-base text-fg">
                Property Details
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted">
              These details are managed by the platform. Contact support to
              update them.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                    Location
                  </p>
                  <p className="text-fg font-medium">
                    {existingPlace.city}, {existingPlace.country}
                  </p>
                  {existingPlace.address && (
                    <p className="text-xs text-muted">
                      {existingPlace.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                    Contact Email
                  </p>
                  <p className="text-fg font-medium">
                    {existingPlace.email || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                    Type
                  </p>
                  <p className="text-fg font-medium">
                    {ACCOMMODATION_TYPE_LABELS[
                      existingPlace.accommodationType
                    ] || existingPlace.accommodationType}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <DollarSign className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                    Retail Price
                  </p>
                  <p className="text-fg font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(existingPlace.retailPrice)}
                    /night
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Tag className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                    Status
                  </p>
                  <Badge
                    className={cn(
                      "text-xs",
                      existingPlace.status === "LIVE"
                        ? "bg-success/20 text-success"
                        : existingPlace.status === "PAUSED"
                          ? "bg-warning/20 text-warning"
                          : "bg-muted/20 text-muted",
                    )}
                  >
                    {existingPlace.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={formik.handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Property Listing */}
        <Card className="glass-2 border-line">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-fg text-base sm:text-lg">
              Listing Details
            </CardTitle>
            <CardDescription className="text-muted text-sm">
              Name, descriptions and photos shown to students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div>
              <Label htmlFor="name" className="text-fg text-sm">
                Place Name *
              </Label>
              <Input
                id="name"
                {...formik.getFieldProps("name")}
                placeholder="e.g., Downtown Student Hub"
                className="mt-1"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-xs text-error mt-1">{formik.errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shortDescription" className="text-fg text-sm">
                Short Description *
              </Label>
              <Input
                id="shortDescription"
                {...formik.getFieldProps("shortDescription")}
                placeholder="Brief tagline (max 100 characters)"
                maxLength={100}
                className="mt-1"
              />
              {formik.touched.shortDescription &&
                formik.errors.shortDescription && (
                  <p className="text-xs text-error mt-1">
                    {formik.errors.shortDescription}
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="fullDescription" className="text-fg text-sm">
                Full Description *
              </Label>
              <Textarea
                id="fullDescription"
                {...formik.getFieldProps("fullDescription")}
                placeholder="Detailed description of the place and its amenities"
                rows={5}
                className="mt-1"
              />
              {formik.touched.fullDescription &&
                formik.errors.fullDescription && (
                  <p className="text-xs text-error mt-1">
                    {formik.errors.fullDescription}
                  </p>
                )}
            </div>

            {/* Photos */}
            <div>
              <Label className="text-fg text-sm">Photos</Label>
              <label className="flex items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-brand hover:bg-white/5 transition-colors mt-1">
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 text-muted" />
                  <p className="mt-1.5 text-xs text-muted">
                    Click to upload images
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-28 sm:h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory & Minimum Bid */}
        <Card className="glass-2 border-line">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-fg text-base sm:text-lg">
              Inventory & Bidding
            </CardTitle>
            <CardDescription className="text-muted text-sm">
              Control how many rooms/beds are available and your minimum
              acceptable bid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxInventory" className="text-fg text-sm">
                  Inventory (rooms/beds for DIAD) *
                </Label>
                <p className="text-xs text-muted mb-1.5">
                  Max bookings available per night via the platform
                </p>
                <Input
                  id="maxInventory"
                  type="number"
                  {...formik.getFieldProps("maxInventory")}
                  placeholder="1"
                  min="1"
                  step="1"
                  className="w-full sm:w-32"
                />
                {formik.touched.maxInventory && formik.errors.maxInventory && (
                  <p className="text-xs text-error mt-1">
                    {formik.errors.maxInventory}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="minimumBid" className="text-fg text-sm">
                  Minimum Acceptable Bid (per night) *
                </Label>
                <p className="text-xs text-muted mb-1.5">
                  Bids below this amount will be automatically rejected
                </p>
                <Input
                  id="minimumBid"
                  type="number"
                  {...formik.getFieldProps("minimumBid")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {formik.touched.minimumBid && formik.errors.minimumBid && (
                  <p className="text-xs text-error mt-1">
                    {formik.errors.minimumBid}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="glass-2 border-line">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-fg text-base sm:text-lg">
              Availability
            </CardTitle>
            <CardDescription className="text-muted text-sm">
              Set which days of the week you accept bookings and block out
              specific dates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-4 sm:px-6">
            {/* Days of week */}
            <div>
              <Label className="text-fg text-sm">Days Available</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    htmlFor={`day-${day.value}`}
                    className={cn(
                      "flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      allowedDaysOfWeek.includes(day.value)
                        ? "border-brand bg-brand/10"
                        : "border-white/20 hover:border-white/40",
                    )}
                  >
                    <span className="text-fg text-xs sm:text-sm">
                      {day.label.slice(0, 3)}
                    </span>
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={allowedDaysOfWeek.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAllowedDaysOfWeek(
                            [...allowedDaysOfWeek, day.value].sort(),
                          );
                        } else {
                          setAllowedDaysOfWeek(
                            allowedDaysOfWeek.filter((d) => d !== day.value),
                          );
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
              {allowedDaysOfWeek.length === 0 && (
                <p className="text-xs text-error mt-2">
                  At least one day must be selected
                </p>
              )}
            </div>

            {/* Blackout dates */}
            <div className="border-t border-white/10 pt-4">
              <Label className="text-fg text-sm">Blackout Dates</Label>
              <p className="text-xs text-muted mb-2">
                Select dates when your property is unavailable
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto justify-start"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {blackoutDates.length > 0
                      ? `${blackoutDates.length} date(s) blocked`
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

              {blackoutDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {blackoutDates.map((date, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {format(date, "MMM dd, yyyy")}
                      <button
                        type="button"
                        onClick={() => handleDateSelect(date)}
                        className="ml-1.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-bg border-t border-white/10 px-4 py-3 flex items-center justify-end gap-3">
          <Button type="submit" disabled={updatePlace.isPending || isUploading}>
            <Save className="mr-2 h-4 w-4" />
            {isUploading
              ? "Uploading images..."
              : updatePlace.isPending
                ? "Saving..."
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
