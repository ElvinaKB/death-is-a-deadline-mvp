import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiClient } from "../../../lib/apiClient";
import { ENDPOINTS } from "../../../config/endpoints.config";

/**
 * Contact / "activate this listing" form shown on a PREVIEW listing (a hotel
 * viewing the listing we built for them). Captures name, email, phone and an
 * optional message and emails it to us — the primary lead-capture CTA for the
 * cold-outreach flow.
 */
export function HotelInquiryForm({
  placeId,
  placeName,
}: {
  placeId: string;
  placeName: string;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const set =
    (k: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    status !== "sending";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    try {
      await apiClient.post(
        ENDPOINTS.PLACE_INQUIRY.replace(":id", placeId),
        form,
      );
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-gold/40 bg-glass-2 p-8 text-center">
        <p className="text-2xl font-black uppercase text-gold mb-2">
          Thank you!
        </p>
        <p className="text-fg">
          We got your details and will reach out shortly to get {placeName} live
          on Deadline.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-bg/40 px-4 py-3 text-fg placeholder:text-muted focus:border-gold focus:outline-none";

  return (
    <div className="rounded-2xl border border-gold/40 bg-glass-2 p-6 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-black uppercase text-fg text-center mb-1">
        Activate this listing
      </h2>
      <p className="text-center text-muted mb-6">
        Start filling {placeName}&rsquo;s empty nights for a 7% commission — no
        platform to manage, no card handling. Drop your details and we&rsquo;ll
        take it from here.
      </p>
      <form onSubmit={submit} className="space-y-3 max-w-xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="Your name *"
            value={form.name}
            onChange={set("name")}
            required
          />
          <input
            className={inputCls}
            type="tel"
            placeholder="Phone *"
            value={form.phone}
            onChange={set("phone")}
            required
          />
        </div>
        <input
          className={inputCls}
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={set("email")}
          required
        />
        <textarea
          className={inputCls}
          placeholder="Any questions? (optional)"
          rows={3}
          value={form.message}
          onChange={set("message")}
        />
        {status === "error" && (
          <p className="text-sm text-red-400">
            Something went wrong — please try again, or email
            hotels@deadlinetravel.com.
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-gold px-8 py-4 text-lg font-black uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {status === "sending" ? "Sending…" : "Send & activate →"}
        </button>
      </form>
    </div>
  );
}
