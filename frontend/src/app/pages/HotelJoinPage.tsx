import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Building2, CheckCircle2, Send } from "lucide-react";
import { HomeHeader } from "../components/home";
import { SiteFooter } from "../components/common/SiteFooter";
import { ROUTES } from "../../config/routes.config";
import { ENDPOINTS } from "../../config/endpoints.config";
import { useApiMutation } from "../../hooks/useApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getFieldError } from "../../utils/formikHelpers";
import { toast } from "sonner";
import { isTurnstileEnabled } from "../../config/turnstile.config";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "../components/common/TurnstileWidget";

// 0=Sun..6=Sat, matching Place.allowedDaysOfWeek so an admin can copy it
// straight into the listing.
const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const PMS_OPTIONS = [
  { value: "cloudbeds", label: "Cloudbeds" },
  { value: "siteminder", label: "SiteMinder" },
  { value: "other", label: "Other" },
];

interface HotelJoinForm {
  hotelName: string;
  address: string;
  phone: string;
  email: string;
  daysOfWeek: number[];
  roomsPerDay: string;
  secretPrice: string;
  pms: string[];
  pmsOther: string;
}

const schema = Yup.object({
  hotelName: Yup.string().required("Hotel name is required"),
  address: Yup.string().required("Address is required"),
  phone: Yup.string().required("Phone is required"),
  email: Yup.string()
    .email("Valid email is required")
    .required("Reservations email is required"),
  daysOfWeek: Yup.array().min(1, "Select at least one day"),
  roomsPerDay: Yup.number()
    .typeError("Enter a number")
    .integer("Whole rooms only")
    .min(1, "At least one room")
    .required("Required"),
  secretPrice: Yup.number()
    .typeError("Enter a price")
    .positive("Enter a price")
    .required("Required"),
});

const labelClassName = "text-fg font-medium";
const fieldClassName =
  "!text-fg bg-[hsl(0_0%_8%)] border-gold/50 placeholder:text-[hsl(0_0%_50%)] focus-visible:border-gold-light focus-visible:ring-[3px] focus-visible:ring-gold/50";
const ctaButtonClassName =
  "w-full btn-bid h-11 text-[0.9375rem] font-semibold tracking-wide text-white disabled:!opacity-100";
const cardClassName = "gold-card rounded-2xl p-4 sm:p-6 md:p-8";

export function HotelJoinPage() {
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();

  const mutation = useApiMutation<{ success: boolean; message: string }, unknown>(
    {
      endpoint: ENDPOINTS.HOTEL_APPLICATION,
      showErrorToast: true,
      onSuccess: () => {
        setSubmitted(true);
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      },
    },
  );

  const formik = useFormik<HotelJoinForm>({
    initialValues: {
      hotelName: "",
      address: "",
      phone: "",
      email: "",
      daysOfWeek: [],
      roomsPerDay: "",
      secretPrice: "",
      pms: [],
      pmsOther: "",
    },
    validationSchema: schema,
    onSubmit: (values) => {
      if (turnstileRequired && !turnstileToken) {
        toast.error("Please complete the security check below.");
        return;
      }
      mutation.mutate({
        hotelName: values.hotelName.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        daysOfWeek: values.daysOfWeek,
        roomsPerDay: Number(values.roomsPerDay),
        secretPrice: Number(values.secretPrice),
        pms: values.pms,
        pmsOther: values.pms.includes("other")
          ? values.pmsOther.trim() || undefined
          : undefined,
        turnstileToken: turnstileToken ?? undefined,
      });
    },
  });

  const toggleDay = (day: number) => {
    const next = formik.values.daysOfWeek.includes(day)
      ? formik.values.daysOfWeek.filter((d) => d !== day)
      : [...formik.values.daysOfWeek, day];
    formik.setFieldValue("daysOfWeek", next);
  };

  const togglePms = (value: string) => {
    const next = formik.values.pms.includes(value)
      ? formik.values.pms.filter((p) => p !== value)
      : [...formik.values.pms, value];
    formik.setFieldValue("pms", next);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <HomeHeader variant="dark" />
      <main
        id="main-content"
        className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full min-w-0"
        tabIndex={-1}
      >
        <Link
          to={ROUTES.HOTELS_LANDING}
          className="text-sm text-gold hover:text-gold-light mb-4 sm:mb-6 inline-block"
        >
          ← For hotels
        </Link>

        <div className="mb-6 sm:mb-8 text-center md:text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 mb-4 mx-auto md:mx-0">
            <Building2 className="h-6 w-6 text-gold" aria-hidden />
          </div>
          <p className="text-xs font-medium tracking-[0.25em] text-gold uppercase mb-2">
            Ready to join?
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold-light mb-3">
            List your hotel on Deadline
          </h1>
          <p className="text-[hsl(0_0%_78%)] text-base leading-relaxed">
            Fill empty rooms with last-minute bids from verified travelers — on
            the nights you choose, at a secret price only you set. Tell us the
            basics below and we&apos;ll build your listing and send you a login
            to review it.
          </p>
          <p className="text-sm text-[hsl(0_0%_70%)] mt-3">
            Questions? Email us at{" "}
            <a
              href="mailto:hotels@deadlinetravel.com"
              className="text-gold hover:text-gold-light underline underline-offset-2"
            >
              hotels@deadlinetravel.com
            </a>
            .
          </p>
        </div>

        {submitted ? (
          <div
            className={`${cardClassName} text-center`}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-10 w-10 text-gold mx-auto mb-4" aria-hidden />
            <h2 className="text-xl font-semibold text-fg mb-2">
              We&apos;ve got it.
            </h2>
            <p className="text-sm text-[hsl(0_0%_78%)]">
              Thanks — we&apos;ll be in touch shortly to get you listed. Keep an
              eye on your inbox for a login to review and edit your listing.
            </p>
          </div>
        ) : (
          <form
            onSubmit={formik.handleSubmit}
            className={`${cardClassName} space-y-5`}
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="hotelName" className={labelClassName}>
                  Hotel name
                </Label>
                <Input
                  id="hotelName"
                  name="hotelName"
                  value={formik.values.hotelName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="e.g. The Pearl Hotel"
                  className={fieldClassName}
                />
                {getFieldError("hotelName", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("hotelName", formik)}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address" className={labelClassName}>
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Street, city, state"
                  className={fieldClassName}
                />
                {getFieldError("address", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("address", formik)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className={labelClassName}>
                  Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="(555) 555-5555"
                  className={fieldClassName}
                />
                {getFieldError("phone", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("phone", formik)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className={labelClassName}>
                  Best email for reservations
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="reservations@hotel.com"
                  className={fieldClassName}
                />
                {getFieldError("email", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("email", formik)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Which days of the week?</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const active = formik.values.daysOfWeek.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      aria-pressed={active}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-gold bg-gold/15 text-fg"
                          : "border-gold/40 text-[hsl(0_0%_78%)] hover:border-gold/70"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {getFieldError("daysOfWeek", formik) && (
                <p className="text-xs text-danger">
                  {getFieldError("daysOfWeek", formik)}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roomsPerDay" className={labelClassName}>
                  How many rooms on those days?
                </Label>
                <Input
                  id="roomsPerDay"
                  name="roomsPerDay"
                  type="number"
                  min={1}
                  value={formik.values.roomsPerDay}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="e.g. 4"
                  className={fieldClassName}
                />
                {getFieldError("roomsPerDay", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("roomsPerDay", formik)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretPrice" className={labelClassName}>
                  Secret price per room{" "}
                  <span className="text-[hsl(0_0%_58%)] font-normal">
                    (never shown publicly)
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(0_0%_60%)]">
                    $
                  </span>
                  <Input
                    id="secretPrice"
                    name="secretPrice"
                    type="number"
                    min={1}
                    step="1"
                    value={formik.values.secretPrice}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="e.g. 120"
                    className={`${fieldClassName} pl-7`}
                  />
                </div>
                {getFieldError("secretPrice", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("secretPrice", formik)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>
                Which channel manager / PMS do you use?{" "}
                <span className="text-[hsl(0_0%_58%)] font-normal">
                  (optional)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {PMS_OPTIONS.map((p) => {
                  const active = formik.values.pms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePms(p.value)}
                      aria-pressed={active}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-gold bg-gold/15 text-fg"
                          : "border-gold/40 text-[hsl(0_0%_78%)] hover:border-gold/70"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {formik.values.pms.includes("other") && (
                <Input
                  name="pmsOther"
                  value={formik.values.pmsOther}
                  onChange={formik.handleChange}
                  placeholder="Which one?"
                  className={`${fieldClassName} mt-2`}
                />
              )}
            </div>

            {turnstileRequired && (
              <div className="space-y-2">
                <Label className={labelClassName}>Security check</Label>
                <TurnstileWidget
                  widgetRef={turnstileRef}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    toast.error("Security check failed. Please try again.");
                  }}
                  className="min-h-[65px] flex justify-start"
                  size="normal"
                />
              </div>
            )}

            <Button
              type="submit"
              className={ctaButtonClassName}
              disabled={
                mutation.isPending ||
                (turnstileRequired && !turnstileToken)
              }
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Submitting…" : "Submit"}
            </Button>

            <p className="text-xs text-[hsl(0_0%_70%)] text-center">
              Already have an invite?{" "}
              <Link
                to={ROUTES.HOTEL_SIGNUP}
                className="text-gold hover:text-gold-light underline underline-offset-2"
              >
                Complete hotel signup
              </Link>
            </p>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
