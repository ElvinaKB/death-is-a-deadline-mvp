import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

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
}

interface MediaFieldsProps {
  formik: FormikLike;
  compact?: boolean;
}

/**
 * Optional listing-page media: a vertical video shown next to the FAQ, and a
 * neighborhood photo/blurb shown next to the location map. Both are just
 * direct URLs — swap them out any time from this same form, no code change
 * needed. Renders on the listing page only when a URL is present.
 */
export function MediaFields({ formik, compact = false }: MediaFieldsProps) {
  const labelClass = compact ? "text-fg text-sm" : "text-fg";
  const helperClass = compact
    ? "text-xs text-muted mb-1.5"
    : "text-sm text-muted mb-1.5";

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="verticalVideoUrl" className={labelClass}>
          Vertical video URL
        </Label>
        <p className={helperClass}>
          Direct link to an MP4/WebM file (not a YouTube, Instagram, or TikTok
          page link). Shown next to the FAQ on the listing page when set.
        </p>
        <Input
          id="verticalVideoUrl"
          type="url"
          placeholder="https://.../room-tour.mp4"
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
        <Label htmlFor="neighborhoodGuideImageUrl" className={labelClass}>
          Neighborhood photo URL
        </Label>
        <p className={helperClass}>
          Optional photo shown alongside the neighborhood guide text above.
        </p>
        <Input
          id="neighborhoodGuideImageUrl"
          type="url"
          placeholder="https://.../neighborhood.jpg"
          {...formik.getFieldProps("neighborhoodGuideImageUrl")}
        />
      </div>
    </div>
  );
}
