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

const validationSchema = Yup.object({
  name: Yup.string()
    .required("Place name is required")
    .min(3, "Name must be at least 3 characters"),
  shortDescription: Yup.string()
    .required("Short description is required")
    .max(100, "Must be 100 characters or less"),
  fullDescription: Yup.string()
    .required("Full description is required")
    .min(50, "Description must be at least 50 characters"),
  city: Yup.string().required("City is required"),
  country: Yup.string().required("Country is required"),
  address: Yup.string().required("Address is required"),
  accommodationType: Yup.string().required("Accommodation type is required"),
  retailPrice: Yup.number()
    .required("Retail price is required")
    .min(1, "Price must be greater than 0"),
  minimumBid: Yup.number()
    .required("Minimum bid is required")
    .min(1, "Minimum bid must be greater than 0")
    .test(
      "less-than-retail",
      "Minimum bid must be less than retail price",
      function (value) {
        return value < this.parent.retailPrice;
      }
    ),
});

export function PlaceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data: existingPlace, isLoading: isLoadingPlace } = usePlace(id || "");
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);

  const formik = useFormik({
    initialValues: {
      name: "",
      shortDescription: "",
      fullDescription: "",
      city: "",
      country: "",
      address: "",
      images: [] as File[],
      accommodationType: "" as AccommodationType,
      retailPrice: 0,
      minimumBid: 0,
      autoAcceptAboveMinimum: true,
      status: PlaceStatus.DRAFT,
    },
    validationSchema,
    onSubmit: async (values) => {
      const data = {
        ...values,
        blackoutDates: blackoutDates.map((d) => d.toISOString().split("T")[0]),
      };

      if (isEditMode && id) {
        await updatePlace.mutateAsync({ ...data, id });
      } else {
        await createPlace.mutateAsync(data);
      }

      navigate(ROUTES.ADMIN_PLACES);
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingPlace && isEditMode) {
      formik.setValues({
        name: existingPlace.name,
        shortDescription: existingPlace.shortDescription,
        fullDescription: existingPlace.fullDescription,
        city: existingPlace.city,
        country: existingPlace.country,
        address: existingPlace.address,
        images: [],
        accommodationType: existingPlace.accommodationType,
        retailPrice: existingPlace.retailPrice,
        minimumBid: existingPlace.minimumBid,
        autoAcceptAboveMinimum: existingPlace.autoAcceptAboveMinimum,
        status: existingPlace.status,
      });

      setImagePreviews(existingPlace.images.map((img) => img.url));
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
    const newImages = [...formik.values.images];
    newImages.splice(index, 1);
    formik.setFieldValue("images", newImages);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateExists = blackoutDates.some(
      (d) => d.toISOString().split("T")[0] === date.toISOString().split("T")[0]
    );

    if (dateExists) {
      setBlackoutDates(
        blackoutDates.filter(
          (d) =>
            d.toISOString().split("T")[0] !== date.toISOString().split("T")[0]
        )
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
        <h1 className="text-3xl font-bold">
          {isEditMode ? "Edit Place" : "Add New Place"}
        </h1>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the core details about the place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Place Name *</Label>
              <Input
                id="name"
                {...formik.getFieldProps("name")}
                placeholder="e.g., Downtown Student Hub"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {formik.errors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="shortDescription">Short Description *</Label>
              <Input
                id="shortDescription"
                {...formik.getFieldProps("shortDescription")}
                placeholder="Brief tagline (max 100 characters)"
                maxLength={100}
              />
              {formik.touched.shortDescription &&
                formik.errors.shortDescription && (
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.shortDescription}
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="fullDescription">Full Description *</Label>
              <Textarea
                id="fullDescription"
                {...formik.getFieldProps("fullDescription")}
                placeholder="Detailed description of the place and its amenities"
                rows={6}
              />
              {formik.touched.fullDescription &&
                formik.errors.fullDescription && (
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.fullDescription}
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...formik.getFieldProps("city")}
                  placeholder="e.g., New York"
                />
                {formik.touched.city && formik.errors.city && (
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.city}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...formik.getFieldProps("country")}
                  placeholder="e.g., USA"
                />
                {formik.touched.country && formik.errors.country && (
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.country}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...formik.getFieldProps("address")}
                placeholder="Full street address"
              />
              {formik.touched.address && formik.errors.address && (
                <p className="text-sm text-red-500 mt-1">
                  {formik.errors.address}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>Upload images of the place</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images">Images</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
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
        <Card>
          <CardHeader>
            <CardTitle>Accommodation Type</CardTitle>
            <CardDescription>Select the type of accommodation</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="accommodationType">Type *</Label>
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
                  )
                )}
              </SelectContent>
            </Select>
            {formik.touched.accommodationType &&
              formik.errors.accommodationType && (
                <p className="text-sm text-red-500 mt-1">
                  {formik.errors.accommodationType}
                </p>
              )}
          </CardContent>
        </Card>

        {/* Pricing & Bidding Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Bidding Rules</CardTitle>
            <CardDescription>
              Set pricing and bidding parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retailPrice">Retail Price (per night) *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  {...formik.getFieldProps("retailPrice")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {formik.touched.retailPrice && formik.errors.retailPrice && (
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.retailPrice}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="minimumBid">
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
                  <p className="text-sm text-red-500 mt-1">
                    {formik.errors.minimumBid}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Auto-accept bids above minimum</Label>
                <p className="text-sm text-muted-foreground">
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
        <Card>
          <CardHeader>
            <CardTitle>Availability Rules</CardTitle>
            <CardDescription>
              Note: Bids are only allowed 0-30 days from today. Set blackout
              dates below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Blackout Dates</Label>
              <p className="text-sm text-muted-foreground mb-2">
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
                <PopoverContent className="w-auto p-0" align="start">
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
        <Card>
          <CardHeader>
            <CardTitle>Publication Status</CardTitle>
            <CardDescription>
              Control the visibility of this place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formik.values.status}
              onValueChange={(value) =>
                formik.setFieldValue("status", value as PlaceStatus)
              }
            >
              <SelectTrigger>
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
        <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.ADMIN_PLACES)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createPlace.isPending || updatePlace.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {createPlace.isPending || updatePlace.isPending
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
