import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Building2,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { HomeHeader } from "../components/home";
import { SiteFooter } from "../components/common/SiteFooter";
import { ROUTES } from "../../config/routes.config";
import { ENDPOINTS } from "../../config/endpoints.config";
import { useApiMutation } from "../../hooks/useApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { getFieldError } from "../../utils/formikHelpers";
import { toast } from "sonner";
import {
  isContactDemoMode,
  isTurnstileDemoMode,
  isTurnstileEnabled,
} from "../../config/turnstile.config";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "../components/common/TurnstileWidget";

export type ContactTopic = "general" | "hotel";

export interface ContactFormRequest {
  name: string;
  email: string;
  topic: ContactTopic;
  subject?: string;
  message: string;
  turnstileToken?: string;
}

const contactSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Valid email is required").required("Email is required"),
  topic: Yup.mixed<ContactTopic>()
    .oneOf(["general", "hotel"])
    .required("Please choose a topic"),
  subject: Yup.string().max(200),
  message: Yup.string()
    .min(10, "Please enter at least 10 characters")
    .required("Message is required"),
});

const CONTACT_EMAIL = "deadline@podshare.com";

const hotelBenefits = [
  "Reach verified students, faculty, and staff",
  "Blind-bidding model — you set your floor, guests name their price",
  "No public rate shopping — premium positioning for your property",
  "Dedicated onboarding and partner support",
];

export function ContactPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();
  const contactDemoMode = isContactDemoMode();
  const turnstileDemoMode = isTurnstileDemoMode();

  const contactMutation = useApiMutation<
    { success: boolean; message: string },
    ContactFormRequest
  >({
    endpoint: ENDPOINTS.CONTACT,
    showErrorToast: true,
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent — we'll get back to you soon.");
      formik.resetForm();
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    },
  });

  const formik = useFormik<ContactFormRequest>({
    initialValues: {
      name: "",
      email: "",
      topic: "general",
      subject: "",
      message: "",
    },
    validationSchema: contactSchema,
    onSubmit: (values) => {
      if (turnstileRequired && !turnstileToken) {
        toast.error("Please complete the security check below.");
        return;
      }

      if (contactDemoMode) {
        setSubmitted(true);
        toast.success(
          "Demo: security check passed. Connect the backend to send real email.",
        );
        formik.resetForm();
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        return;
      }

      contactMutation.mutate({
        ...values,
        subject: values.subject?.trim() || undefined,
        turnstileToken: turnstileToken ?? undefined,
      });
    },
  });

  const focusHotelInquiry = () => {
    formik.setFieldValue("topic", "hotel");
    formik.setFieldValue(
      "subject",
      formik.values.subject || "Hotel listing inquiry",
    );
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      document.getElementById("contact-message")?.focus();
    }, 400);
  };

  const labelClassName = "text-fg font-medium";

  const fieldClassName =
    "!text-fg bg-[hsl(0_0%_8%)] border-gold/50 placeholder:text-[hsl(0_0%_50%)] focus-visible:border-gold-light focus-visible:ring-[3px] focus-visible:ring-gold/50 disabled:opacity-70 disabled:cursor-not-allowed";

  const selectClassName =
    "flex h-9 w-full rounded-md border border-gold/50 bg-[hsl(0_0%_8%)] px-3 py-1 text-sm !text-fg outline-none transition-[border-color,box-shadow] focus-visible:border-gold-light focus-visible:ring-[3px] focus-visible:ring-gold/50 disabled:opacity-70 disabled:cursor-not-allowed";

  const ctaButtonClassName =
    "w-full btn-bid h-11 text-[0.9375rem] font-semibold tracking-wide text-white disabled:!opacity-100";

  const cardClassName = "gold-card rounded-2xl p-4 sm:p-6 md:p-8";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <HomeHeader variant="dark" />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full min-w-0">
        <Link
          to={ROUTES.HOME}
          className="text-sm text-gold hover:text-gold-light mb-4 sm:mb-6 inline-block"
        >
          ← Back to marketplace
        </Link>

        <div className="mb-6 sm:mb-10 text-center md:text-left">
          <p className="text-xs font-medium tracking-[0.25em] text-gold uppercase mb-2">
            Get in touch
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold-light mb-3">
            Contact Us
          </h1>
          <p className="text-[hsl(0_0%_78%)] text-sm md:text-base max-w-2xl leading-relaxed mx-auto md:mx-0">
            Questions, feedback, or partnership ideas — send us a message. Hotels
            interested in listing on Deadline can use the form or the dedicated
            section below.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-5 lg:gap-10">
          {/* Contact form — first on mobile */}
          <section
            ref={formRef}
            id="contact-form"
            className={`order-1 lg:order-2 lg:col-span-3 ${cardClassName} min-w-0`}
            aria-labelledby="contact-form-heading"
          >
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="h-5 w-5 text-gold" aria-hidden />
              <h2
                id="contact-form-heading"
                className="text-lg font-semibold text-fg"
              >
                Send a message
              </h2>
            </div>

            {submitted && (
              <p
                className="mb-6 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-fg"
                role="status"
              >
                Thank you — your message was sent to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-gold hover:text-gold-light underline"
                >
                  {CONTACT_EMAIL}
                </a>
                . We typically respond within a few business days.
              </p>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className={labelClassName}>
                    Name
                  </Label>
                  <Input
                    id="contact-name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Your name"
                    className={fieldClassName}
                    aria-invalid={!!getFieldError("name", formik)}
                  />
                  {getFieldError("name", formik) && (
                    <p className="text-xs text-danger">
                      {getFieldError("name", formik)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className={labelClassName}>
                    Email
                  </Label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="you@example.com"
                    className={fieldClassName}
                    aria-invalid={!!getFieldError("email", formik)}
                  />
                  {getFieldError("email", formik) && (
                    <p className="text-xs text-danger">
                      {getFieldError("email", formik)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-topic" className={labelClassName}>
                  What can we help with?
                </Label>
                <select
                  id="contact-topic"
                  name="topic"
                  value={formik.values.topic}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={selectClassName}
                >
                  <option value="general">General message</option>
                  <option value="hotel">List my hotel / partnership</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject" className={labelClassName}>
                  Subject{" "}
                  <span className="text-[hsl(0_0%_58%)] font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="contact-subject"
                  name="subject"
                  value={formik.values.subject}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder={
                    formik.values.topic === "hotel"
                      ? "e.g. Boutique hotel in Austin"
                      : "How can we help?"
                  }
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message" className={labelClassName}>
                  Message
                </Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  value={formik.values.message}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder={
                    formik.values.topic === "hotel"
                      ? "Property name, location, room count, and anything else we should know..."
                      : "Your question or feedback..."
                  }
                  className={`min-h-[140px] resize-y ${fieldClassName}`}
                  aria-invalid={!!getFieldError("message", formik)}
                />
                {getFieldError("message", formik) && (
                  <p className="text-xs text-danger">
                    {getFieldError("message", formik)}
                  </p>
                )}
              </div>

              {turnstileRequired && (
                <div className="space-y-2">
                  <Label className={labelClassName}>Security check</Label>
                  {turnstileDemoMode && (
                    <p className="text-xs text-muted leading-relaxed">
                      Demo mode: Cloudflare test widget (auto-passes on localhost).
                      Complete the check, then send — no backend required.
                    </p>
                  )}
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
                  contactMutation.isPending ||
                  (turnstileRequired && !turnstileToken)
                }
              >
                <Send className="h-4 w-4" />
                {contactMutation.isPending ? "Sending…" : "Send message"}
              </Button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[hsl(0_0%_72%)]">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Or email us directly at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-gold hover:text-gold-light underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          {/* Hotel CTA — below form on mobile */}
          <section
            className={`order-2 lg:order-1 lg:col-span-2 ${cardClassName} flex flex-col min-w-0`}
            aria-labelledby="hotel-cta-heading"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 mb-5">
              <Building2 className="h-6 w-6 text-gold" aria-hidden />
            </div>
            <h2
              id="hotel-cta-heading"
              className="text-xl font-semibold text-fg mb-2"
            >
              List Your Hotel
            </h2>
            <p className="text-sm text-[hsl(0_0%_78%)] mb-6 leading-relaxed">
              Join Deadline Travel&apos;s verified student marketplace. Tell us
              about your property and our team will reach out about onboarding.
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {hotelBenefits.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm text-[hsl(0_0%_82%)] leading-snug"
                >
                  <Sparkles
                    className="h-4 w-4 shrink-0 text-gold mt-0.5"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className={`${ctaButtonClassName} mb-3`}
              onClick={focusHotelInquiry}
            >
              <Users className="h-4 w-4" />
              Inquire about listing
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
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
