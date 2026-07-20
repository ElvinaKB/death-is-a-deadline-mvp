import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { CheckCircle2, Copy, Plus, Share2, Sparkles, X } from "lucide-react";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { useAppSelector } from "../../../store/hooks";
import { ApprovalStatus } from "../../../types/auth.types";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { HomeHeader } from "../../components/home";

const TRIP_TYPES = [
  "Weekend getaway",
  "Beach",
  "City",
  "Ski",
  "Business",
  "Road trip",
  "Concerts",
  "Weddings",
];
const HOTEL_STYLES = [
  "Boutique",
  "Luxury",
  "Design",
  "Hostel",
  "Wellness",
  "Historic",
  "Pet Friendly",
];
const BUDGET_OPTIONS = ["$100–150", "$150–250", "$250+"];
const INTERESTS = [
  "Michelin restaurants",
  "Wine tasting",
  "Live music",
  "Surfing",
  "Museums",
  "Architecture",
  "Cocktail bars",
  "Hiking",
  "National Parks",
  "Formula 1",
  "Fashion",
  "Art",
];

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  linkedinProfileUrl: string;
  instagramHandle: string;
  referralCode: string | null;
  referralCredit: number;
  travelPreferences: {
    tripTypes: string[];
    hotelStyle: string[];
    budget: string | null;
  };
  interests: string[];
  wishlistDestinations: string[];
  memberSince: string;
  successfulStays: number;
  hotelsUnlocked: number;
  citiesVisited: number;
  friendsReferred: number;
  earlyAccessStatus: { name: string; description: string };
}

function ToggleGrid({
  options,
  selected,
  onToggle,
  columns = "sm:grid-cols-2",
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 ${columns} gap-2`}>
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className="flex items-center gap-2 rounded-md border border-line/60 px-3 py-2 cursor-pointer hover:bg-white/5"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(option)}
            />
            <span className="text-sm text-fg">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line/60 bg-bg/40 px-4 py-3">
      <p className="text-2xl font-bold text-gold">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-muted/80 mt-1">{hint}</p>}
    </div>
  );
}

function TagInput({
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="bg-glass border-line text-fg placeholder:text-muted"
        />
        <Button type="button" variant="outline" size="sm" className="border-line shrink-0" onClick={submit}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold"
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                className="hover:text-fg"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const { data, isLoading } = useApiQuery<{ profile: ProfileData }>({
    queryKey: [QUERY_KEYS.PROFILE],
    endpoint: ENDPOINTS.PROFILE,
  });
  const profile = data?.profile;

  const updateMutation = useApiMutation<{ message: string }, Partial<ProfileData>>({
    endpoint: ENDPOINTS.UPDATE_PROFILE,
    method: "PUT",
    onSuccess: () => toast.success("Profile saved"),
  });

  const referralMutation = useApiMutation<{ referralCode: string }, void>({
    endpoint: ENDPOINTS.PROFILE_REFERRAL_CODE,
    onSuccess: () => {
      formik.setFieldValue("referralCode", referralMutation.data?.referralCode);
    },
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      phone: "",
      occupation: "",
      linkedinProfileUrl: "",
      instagramHandle: "",
      referralCode: null as string | null,
      tripTypes: [] as string[],
      hotelStyle: [] as string[],
      budget: null as string | null,
      interests: [] as string[],
    },
    enableReinitialize: true,
    onSubmit: (values) => {
      updateMutation.mutate({
        name: values.name,
        phone: values.phone,
        occupation: values.occupation,
        linkedinProfileUrl: values.linkedinProfileUrl,
        instagramHandle: values.instagramHandle,
        travelPreferences: {
          tripTypes: values.tripTypes,
          hotelStyle: values.hotelStyle,
          budget: values.budget,
        },
        interests: values.interests,
        wishlistDestinations: wishlist,
      });
    },
  });

  useEffect(() => {
    if (!profile) return;
    formik.setValues({
      name: profile.name,
      phone: profile.phone,
      occupation: profile.occupation,
      linkedinProfileUrl: profile.linkedinProfileUrl,
      instagramHandle: profile.instagramHandle,
      referralCode: profile.referralCode,
      tripTypes: profile.travelPreferences?.tripTypes ?? [],
      hotelStyle: profile.travelPreferences?.hotelStyle ?? [],
      budget: profile.travelPreferences?.budget ?? null,
      interests: profile.interests ?? [],
    });
    setWishlist(profile.wishlistDestinations ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const toggleIn = (field: "tripTypes" | "hotelStyle" | "interests", value: string) => {
    const current = formik.values[field];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    formik.setFieldValue(field, next);
  };

  const addWishlistDestination = (value: string) => {
    setWishlist((prev) => (prev.some((v) => v.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
  };

  const removeWishlistDestination = (value: string) => {
    setWishlist((prev) => prev.filter((v) => v !== value));
  };

  const referralCode = formik.values.referralCode;
  const shareText = referralCode
    ? `Join Deadline and I'll both get $10 in travel credit — use my code ${referralCode} at signup: https://www.deadlinetravel.com/signup?ref=${referralCode}`
    : "";

  const handleShare = async () => {
    if (!referralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied — paste it anywhere to share!");
    } catch {
      toast.error("Couldn't copy. Try sharing your code directly.");
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success("Code copied");
    } catch {
      toast.error("Couldn't copy the code");
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-bg">
        <HomeHeader />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-muted">Loading your profile…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 space-y-6" tabIndex={-1}>
      <div>
        <h1 className="text-3xl font-bold text-fg">Your Profile</h1>
        <p className="text-muted mt-1">
          Tell us about yourself so we can surface better travel opportunities for you.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* 1. Account */}
        <Card className="bg-glass-2 border-line">
          <CardHeader>
            <CardTitle className="text-fg flex items-center gap-2">
              <span className="text-gold">1.</span> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.approvalStatus === ApprovalStatus.APPROVED && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Traveler
              </span>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-fg">Name</Label>
                <Input
                  id="name"
                  value={formik.values.name}
                  onChange={(e) => formik.setFieldValue("name", e.target.value)}
                  className="bg-glass border-line text-fg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-fg">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-glass border-line text-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-fg">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={formik.values.phone}
                  onChange={(e) => formik.setFieldValue("phone", e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-fg">What I do for work</Label>
                <Input
                  id="occupation"
                  placeholder="Founder & Entrepreneur"
                  value={formik.values.occupation}
                  onChange={(e) => formik.setFieldValue("occupation", e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-fg">LinkedIn (optional)</Label>
                <Input
                  id="linkedin"
                  placeholder="linkedin.com/in/yourname"
                  value={formik.values.linkedinProfileUrl}
                  onChange={(e) => formik.setFieldValue("linkedinProfileUrl", e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-fg">Instagram (optional)</Label>
                <Input
                  id="instagram"
                  placeholder="@yourname"
                  value={formik.values.instagramHandle}
                  onChange={(e) => formik.setFieldValue("instagramHandle", e.target.value)}
                  className="bg-glass border-line text-fg placeholder:text-muted"
                />
              </div>
            </div>

            <div className="border-t border-line/60 pt-4 space-y-2">
              <Label className="text-fg">Your Rewards Code</Label>
              <p className="text-xs text-muted">
                Share your code — you both get $10 in travel credit when a friend joins.
              </p>
              {referralCode ? (
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold tracking-wider text-gold">
                    {referralCode}
                  </code>
                  <Button type="button" variant="outline" size="sm" className="border-line" onClick={handleCopyCode}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-line" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share Code
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="btn-bid"
                  disabled={referralMutation.isPending}
                  onClick={() => referralMutation.mutate()}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {referralMutation.isPending ? "Generating..." : "Generate Rewards Code"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Travel Preferences */}
        <Card className="bg-glass-2 border-line">
          <CardHeader>
            <CardTitle className="text-fg flex items-center gap-2">
              <span className="text-gold">2.</span> Travel Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-fg mb-2 block">Trip Types</Label>
              <p className="text-xs text-muted mb-3">Select all that apply</p>
              <ToggleGrid options={TRIP_TYPES} selected={formik.values.tripTypes} onToggle={(v) => toggleIn("tripTypes", v)} />
            </div>
            <div>
              <Label className="text-fg mb-2 block">Hotel Style</Label>
              <p className="text-xs text-muted mb-3">Choose your vibe</p>
              <ToggleGrid options={HOTEL_STYLES} selected={formik.values.hotelStyle} onToggle={(v) => toggleIn("hotelStyle", v)} />
            </div>
            <div>
              <Label className="text-fg mb-2 block">Budget</Label>
              <p className="text-xs text-muted mb-3">What&apos;s your sweet spot?</p>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => formik.setFieldValue("budget", option)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      formik.values.budget === option
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-line text-fg hover:border-gold/50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Interests */}
        <Card className="bg-glass-2 border-line">
          <CardHeader>
            <CardTitle className="text-fg flex items-center gap-2">
              <span className="text-gold">3.</span> Interests
            </CardTitle>
            <CardDescription className="text-muted">
              What kind of experiences do you enjoy?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGrid
              options={INTERESTS}
              selected={formik.values.interests}
              onToggle={(v) => toggleIn("interests", v)}
              columns="sm:grid-cols-3"
            />
          </CardContent>
        </Card>

        {/* 4. Rewards */}
        <Card className="bg-glass-2 border-line">
          <CardHeader>
            <CardTitle className="text-fg flex items-center gap-2">
              <span className="text-gold">4.</span> Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile label="Member since" value={new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })} />
              <StatTile
                label="Successful stays"
                value={profile.successfulStays}
                hint="Stays you've completed and paid for"
              />
              <StatTile
                label="Hotels unlocked"
                value={profile.hotelsUnlocked}
                hint="Distinct properties you've been accepted at"
              />
              <StatTile label="Cities visited" value={profile.citiesVisited} />
              <StatTile label="Friends referred" value={profile.friendsReferred} />
              <StatTile
                label="Early access status"
                value={profile.earlyAccessStatus.name}
                hint={profile.earlyAccessStatus.description}
              />
            </div>
            {profile.referralCredit > 0 && (
              <p className="text-sm text-success">
                You&apos;ve earned ${profile.referralCredit} in referral credit so far.
              </p>
            )}

            <div>
              <Label className="text-fg mb-2 block">Where do you want to go next?</Label>
              <p className="text-xs text-muted mb-3">
                Type a destination and hit Add — we use these to decide where to sign new hotels.
              </p>
              <TagInput
                values={wishlist}
                onAdd={addWishlistDestination}
                onRemove={removeWishlistDestination}
                placeholder="e.g. Lisbon, Tulum, Big Sur…"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="btn-bid w-full sm:w-auto" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
      </main>
    </div>
  );
}
