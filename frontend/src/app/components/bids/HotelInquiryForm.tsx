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
      <h2 className="font-serif text-3xl text-fg text-center mb-2">
        List {placeName}&rsquo;s empty nights
      </h2>
      <p className="text-center text-muted mb-6 max-w-xl mx-auto">
        No commitment. Leave your best reservations contact and we&rsquo;ll set
        your secret price, room count and days together on a quick call.
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
            placeholder="Best contact number *"
            value={form.phone}
            onChange={set("phone")}
            required
          />
        </div>
        <input
          className={inputCls}
          type="email"
          placeholder="Reservations email *"
          value={form.email}
          onChange={set("email")}
          required
        />
        <input
          className={inputCls}
          placeholder="Anything we should know? (optional)"
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
          className="btn-bid-premium w-full h-14 text-base uppercase tracking-wider disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "List my hotel →"}
        </button>
        <p className="text-center text-muted text-xs">
          Prefer to ask first? Same form — add your question above and
          we&rsquo;ll reach out.
        </p>
      </form>
    </div>
  );
}
