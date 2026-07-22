import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../utils/supabaseClient";
import { SUPABASE_BUCKET } from "../../../lib/constants";
import {
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Copy,
  Flag,
  Globe,
  Landmark,
  LucideIcon,
  Martini,
  Mountain,
  Music,
  Palette,
  Plus,
  Share2,
  Shirt,
  Sparkles,
  Star,
  Ticket,
  Trees,
  Users,
  Utensils,
  Waves,
  Wine,
  X,
} from "lucide-react";
import { useApiQuery, useApiMutation } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { apiClient } from "../../../lib/apiClient";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { useAppSelector } from "../../../store/hooks";
import { ApprovalStatus } from "../../../types/auth.types";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { MemberPageShell } from "../../components/member/MemberPageShell";

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
const INTEREST_ICONS: Record<string, LucideIcon> = {
  "Michelin restaurants": Utensils,
  "Wine tasting": Wine,
  "Live music": Music,
  Surfing: Waves,
  Museums: Landmark,
  Architecture: Landmark,
  "Cocktail bars": Martini,
  Hiking: Mountain,
  "National Parks": Trees,
  "Formula 1": Flag,
  Fashion: Shirt,
  Art: Palette,
};
const INTERESTS = Object.keys(INTEREST_ICONS);

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  linkedinProfileUrl: string;
  instagramHandle: string;
  avatarUrl?: string | null;
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
            className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
              checked
                ? "border-gold bg-gold/10"
                : "border-line/60 bg-white/5 hover:bg-white/10 hover:border-gold/40"
            }`}
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

function InterestGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {INTERESTS.map((option) => {
        const Icon = INTEREST_ICONS[option];
        const checked = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
              checked
                ? "border-gold bg-gold/10 text-fg"
                : "border-line/60 text-fg hover:border-gold/40"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${checked ? "text-gold" : "text-muted"}`} />
            <span className="flex-1">{option}</span>
            <Checkbox checked={checked} onCheckedChange={() => onToggle(option)} className="pointer-events-none" />
          </button>
        );
      })}
    </div>
  );
}

function BudgetSlider({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) {
  const activeIndex = value ? BUDGET_OPTIONS.indexOf(value) : -1;
  const fillPercent =
    activeIndex >= 0 ? (activeIndex / (BUDGET_OPTIONS.length - 1)) * 100 : 0;

  return (
    <div className="pt-1">
      <div className="relative h-1.5 rounded-full bg-line/40">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gold transition-all"
          style={{ width: activeIndex >= 0 ? `${fillPercent}%` : "0%" }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        {BUDGET_OPTIONS.map((option, idx) => {
          const isActive = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className="flex flex-col items-center gap-1.5 -mt-[15px]"
            >
              <span
                className={`h-3 w-3 rounded-full border-2 transition-colors ${
                  isActive || idx <= activeIndex
                    ? "border-gold bg-gold"
                    : "border-line bg-bg"
                }`}
              />
              <span className={`text-xs ${isActive ? "text-gold font-medium" : "text-muted"}`}>
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RewardsRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-line/40 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="text-sm text-fg">{label}</p>
          {hint && <p className="text-[11px] text-muted/80 truncate">{hint}</p>}
        </div>
      </div>
      <span className="text-sm font-semibold text-gold shrink-0">{value}</span>
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useApiQuery<{ profile: ProfileData }>({
    queryKey: [QUERY_KEYS.PROFILE],
    endpoint: ENDPOINTS.PROFILE,
  });
  const profile = data?.profile;

  const avatarMutation = useApiMutation<{ data: { avatarUrl: string } }, { avatarUrl: string }>({
    endpoint: ENDPOINTS.PROFILE_AVATAR,
    method: "PUT",
    onSuccess: () => {
      toast.success("Photo updated");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROFILE] });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const { path, token } = await apiClient.post<{
        path: string;
        token: string;
      }>(ENDPOINTS.UPLOAD_URL, { context: "avatar", fileExt: ext });
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .uploadToSignedUrl(path, token, file);
      if (uploadError) {
        toast.error(uploadError.message || "Failed to upload photo");
        return;
      }
      const { data: publicUrlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      if (!publicUrlData?.publicUrl) {
        toast.error("Failed to get photo URL");
        return;
      }
      avatarMutation.mutate({ avatarUrl: publicUrlData.publicUrl });
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  if (isLoading || !profile) {
    return (
      <MemberPageShell>
        <p className="text-muted">Loading your profile…</p>
      </MemberPageShell>
    );
  }

  return (
    <MemberPageShell>
      <form onSubmit={formik.handleSubmit} className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-fg">Your Profile</h1>
            <p className="text-muted mt-1">
              Tell us about yourself so we can surface better travel opportunities for you.
            </p>
          </div>
          <Button type="submit" className="btn-bid shrink-0" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* 1. Account */}
        <Card className="bg-glass-2 border-line">
          <CardHeader>
            <CardTitle className="text-fg flex items-center gap-2">
              <span className="text-gold">1.</span> Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex sm:flex-col items-center sm:items-start gap-3 shrink-0">
                <div className="relative">
                  <Avatar className="h-24 w-24 border border-line">
                    {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
                    <AvatarFallback className="bg-gold/15 text-gold text-xl font-semibold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    disabled={avatarUploading}
                    title="Change photo"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg text-fg hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-60"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  {user?.approvalStatus === ApprovalStatus.APPROVED && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified Traveler
                    </span>
                  )}
                  <p className="text-xs text-muted mt-2">
                    Member since{" "}
                    {new Date(profile.memberSince).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
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
              </div>
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
              <BudgetSlider
                value={formik.values.budget}
                onChange={(v) => formik.setFieldValue("budget", v)}
              />
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
            <InterestGrid selected={formik.values.interests} onToggle={(v) => toggleIn("interests", v)} />
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
            <div>
              <RewardsRow
                icon={Calendar}
                label="Member since"
                value={new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              />
              <RewardsRow
                icon={Ticket}
                label="Successful stays"
                value={profile.successfulStays}
                hint="Stays you've completed and paid for"
              />
              <RewardsRow
                icon={Briefcase}
                label="Hotels unlocked"
                value={profile.hotelsUnlocked}
                hint="Distinct properties you've been accepted at"
              />
              <RewardsRow icon={Globe} label="Cities visited" value={profile.citiesVisited} />
              <RewardsRow icon={Users} label="Friends referred" value={profile.friendsReferred} />
              <RewardsRow
                icon={Star}
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
      </form>
    </MemberPageShell>
  );
}
