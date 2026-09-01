import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Upload, X } from "lucide-react";

// Loosely typed to whatever formik instance the admin/hotel-owner place
// forms already build — these three fields are optional on every place, so
// there's nothing here that needs its own validation state beyond formik's.
interface FormikLike {
  values: {
    verticalVideoUrl?: string;
    neighborhoodGuideText?: string;
    neighborhoodGuideImageUrl?: string;
  };
  getFieldProps: (name: string) => Record<string, unknown>;
  setFieldValue: (field: string, value: unknown) => void;
}

interface MediaFieldsProps {
  formik: FormikLike;
  /** Uploads one file to storage and resolves with its public URL. */
  uploadImage: (file: File) => Promise<string>;
  compact?: boolean;
}

/**
 * Optional listing-page media: a vertical video shown next to the FAQ, and a
 * neighborhood photo/blurb shown next to the location map. Renders on the
 * listing page only when set. The neighborhood photo is a real upload (not
 * a pasted URL) — a share link from Google Photos, iCloud, etc. isn't a
 * direct image file and won't render, so we upload it the same way the main
 * gallery photos are uploaded instead of asking for a URL that has to be
 * "just right."
 */
export function MediaFields({
  formik,
  uploadImage,
  compact = false,
}: MediaFieldsProps) {
  const labelClass = compact ? "text-fg text-sm" : "text-fg";
  const helperClass = compact
    ? "text-xs text-muted mb-1.5"
    : "text-sm text-muted mb-1.5";
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const neighborhoodImageUrl = formik.values.neighborhoodGuideImageUrl;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadImage(file);
      formik.setFieldValue("neighborhoodGuideImageUrl", url);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't upload that photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="verticalVideoUrl" className={labelClass}>
          Vertical video URL
        </Label>
        <p className={helperClass}>
          A YouTube link (Shorts or regular) or a direct MP4/WebM file link.
          Instagram and TikTok page links aren&apos;t supported yet. Shown
          next to the FAQ on the listing page when set.
        </p>
        <Input
          id="verticalVideoUrl"
          type="url"
          placeholder="https://youtube.com/shorts/... or https://.../room-tour.mp4"
          {...formik.getFieldProps("verticalVideoUrl")}
        />
      </div>

      <div>
        <Label htmlFor="neighborhoodGuideText" className={labelClass}>
          Neighborhood guide
        </Label>
        <p className={helperClass}>
          A few sentences on what&apos;s nearby — restaurants, bars, sights.
          Shown next to the location map when set.
        </p>
        <Textarea
          id="neighborhoodGuideText"
          rows={4}
          placeholder="Steps from Fairfax Ave — coffee at..., dinner at..., a short walk to..."
          {...formik.getFieldProps("neighborhoodGuideText")}
        />
      </div>

      <div>
        <Label className={labelClass}>Neighborhood photo</Label>
        <p className={helperClass}>
          Optional photo shown alongside the neighborhood guide text above.
        </p>
        {neighborhoodImageUrl && (
          <div className="relative w-full max-w-xs h-32 rounded-lg overflow-hidden mb-2 border border-line">
            <img
              src={neighborhoodImageUrl}
              alt="Neighborhood preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() =>
                formik.setFieldValue("neighborhoodGuideImageUrl", "")
              }
              className="absolute top-1.5 right-1.5 bg-black/70 rounded-full p-1 hover:bg-black/90"
              aria-label="Remove neighborhood photo"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {isUploading
            ? "Uploading..."
            : neighborhoodImageUrl
              ? "Replace photo"
              : "Upload photo"}
        </Button>
      </div>
    </div>
  );
}
