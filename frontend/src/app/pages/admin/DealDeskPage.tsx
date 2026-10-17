import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useApiQuery } from "../../../hooks/useApi";
import { apiClient } from "../../../lib/apiClient";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { getPublicPlacePath } from "../../../utils/placeUrl";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

// Deal desk — Stage 1: call hotels about members whose best-and-final bid fell
// just short of the secret price. The gap is internal (for wholesale it comes
// from Nuitée's rate) and is never read out to the hotel.

interface Contact {
  placeId: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface DealCall {
  id: string;
  outcome: Outcome;
  amountPerNight: string | number | null;
  memberBidPerNight: string | number | null;
  reason: string | null;
  notes: string | null;
  directLead: boolean;
  callbackAt: string | null;
  checkInDate: string | null;
  createdAt: string;
}

interface Opportunity {
  sessionId: string;
  bestBidId: string;
  memberId: string;
  memberFirstName: string;
  memberName: string | null;
  memberEmail: string | null;
  placeId: string;
  slug: string;
  hotel: string;
  city: string;
  supplySource: string;
  timezone: string | null;
  publicPricePerNight: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  bestBidPerNight: number;
  bidsInSession: number;
  lastBidAt: string;
  walkedAway: boolean;
  cardOnFile: boolean;
  memberPricePerNight: number | null;
  gapPct: number | null;
  contact: Contact | null;
  lastCall: DealCall | null;
}

interface Stats {
  calls: number;
  reachRatePct: number | null;
  yesRatePct: number | null;
  yes: number;
  counters: number;
  avgCounterAboveBid: number | null;
  decisionMakers: number;
  directLeads: number;
}

type Outcome = "YES" | "COUNTER" | "NO" | "NO_ANSWER" | "CONTACT_CAPTURED";

const OUTCOME_LABEL: Record<Outcome, string> = {
  YES: "Yes",
  COUNTER: "Counter",
  NO: "No",
  NO_ANSWER: "No answer / call back",
  CONTACT_CAPTURED: "Contact captured",
};

const NO_REASONS = [
  "Rate parity / can't go below OTAs",
  "Said email them",
  "Couldn't reach decision-maker",
  "Sold out",
  "Not interested",
  "Other",
];

const money = (n: number | string | null | undefined) =>
  n == null || n === "" ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;

function hotelNow(tz: string | null) {
  try {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: tz || "America/Los_Angeles" }),
    );
  } catch {
    return new Date();
  }
}

function hotelTodayKey(tz: string | null) {
  return format(hotelNow(tz), "yyyy-MM-dd");
}

/** "2:40 PM hotel time · good time to call" etc. */
function callTiming(o: Opportunity) {
  const now = hotelNow(o.timezone);
  const h = now.getHours() + now.getMinutes() / 60;
  const clock = format(now, "h:mm a");
  const tonight = o.checkInDate <= hotelTodayKey(o.timezone);
  let hint = "";
  if (h >= 14 && h < 16) hint = "best time to call";
  else if (h >= 8 && h < 14) hint = "OK — before check-in rush";
  else if (h >= 16 && h < 18) hint = "check-in rush";
  else hint = "after hours";
  let countdown: string | null = null;
  if (tonight) {
    const left = 18 - h;
    countdown =
      left > 0
        ? `${Math.floor(left)}h ${Math.round((left % 1) * 60)}m until 6pm — tonight deal`
        : "Past 6pm — tonight deal is going stale";
  }
  return { clock, hint, tonight, countdown };
}

function stayLabel(o: Opportunity) {
  const fmt = (d: string) => format(new Date(`${d}T12:00:00`), "EEE MMM d");
  return `${fmt(o.checkInDate)} → ${fmt(o.checkOutDate)} · ${o.nights} night${o.nights === 1 ? "" : "s"}`;
}

export function DealDeskPage() {
  const [maxGap, setMaxGap] = useState(100);
  const [days, setDays] = useState(3);
  const [includeCalled, setIncludeCalled] = useState(false);
  const [tonightOnly, setTonightOnly] = useState(false);
  const [source, setSource] = useState<"all" | "wholesale" | "direct">("all");
  const [city, setCity] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<{ opportunities: Opportunity[] }>({
    queryKey: ["deal-desk", "queue", maxGap, days, includeCalled],
    endpoint: ENDPOINTS.DEAL_DESK_QUEUE,
    params: { maxGap, days, includeCalled: String(includeCalled) },
    staleTime: 30_000,
  });
  const { data: stats } = useApiQuery<Stats>({
    queryKey: ["deal-desk", "stats"],
    endpoint: ENDPOINTS.DEAL_DESK_STATS,
    params: { days: 30 },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const q = city.trim().toLowerCase();
    return (data?.opportunities ?? []).filter(
      (o) =>
        (!tonightOnly || o.checkInDate <= hotelTodayKey(o.timezone)) &&
        (source === "all" || o.supplySource === source) &&
        (!q || o.city.toLowerCase().includes(q) || o.hotel.toLowerCase().includes(q)),
    );
  }, [data, tonightOnly, source, city]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg">Deal desk</h1>
        <p className="text-muted mt-1">
          Members who just missed a hotel&apos;s secret price. Call the hotel, ask
          them to take the member&apos;s number, and log what they say.
        </p>
      </div>

      {/* Scoreboard (last 30 days) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Calls (30d)", value: stats?.calls ?? 0 },
          {
            label: "Reached decision-maker",
            value: stats?.reachRatePct != null ? `${stats.reachRatePct}%` : "—",
          },
          {
            label: "Yes rate",
            value: stats?.yesRatePct != null ? `${stats.yesRatePct}%` : "—",
            sub: `${stats?.yes ?? 0} yes`,
          },
          {
            label: "Avg counter vs bid",
            value:
              stats?.avgCounterAboveBid != null
                ? `+$${stats.avgCounterAboveBid}`
                : "—",
            sub: `${stats?.counters ?? 0} counters`,
          },
          { label: "Decision-makers saved", value: stats?.decisionMakers ?? 0 },
          { label: "Direct-listing leads", value: stats?.directLeads ?? 0 },
        ].map((c) => (
          <Card key={c.label} className="bg-glass border-line">
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted">{c.label}</p>
              <p className="text-2xl font-bold text-fg mt-1">{c.value}</p>
              {c.sub && <p className="text-xs text-muted mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City or hotel"
            className="bg-glass border-line pl-9 text-fg"
          />
        </div>
        <Toggle on={tonightOnly} onClick={() => setTonightOnly((v) => !v)}>
          Tonight only
        </Toggle>
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            ["all", "All"],
            ["wholesale", "Wholesale"],
            ["direct", "Partners"],
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          Within
          <select
            value={maxGap}
            onChange={(e) => setMaxGap(Number(e.target.value))}
            className="rounded-md border border-line bg-glass px-2 py-1.5 text-fg"
          >
            {[5, 10, 15, 25, 100].map((g) => (
              <option key={g} value={g}>
                {g === 100 ? "any gap" : `${g}%`}
              </option>
            ))}
          </select>
          of secret price
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Bids from last
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-line bg-glass px-2 py-1.5 text-fg"
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <Toggle on={includeCalled} onClick={() => setIncludeCalled((v) => !v)}>
          Show already called
        </Toggle>
      </div>

      <Card className="glass-2 border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            Call list <span className="text-muted font-normal">({rows.length})</span>
          </CardTitle>
          <p className="text-sm text-muted">
            Tonight first, then closest to the secret price. Live stays only.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted">
              Nobody close right now. Widen the gap or the date range above.
            </p>
          )}
          {rows.map((o) => (
            <OpportunityCard
              key={o.sessionId}
              o={o}
              open={open === o.sessionId}
              onToggle={() => setOpen((cur) => (cur === o.sessionId ? null : o.sessionId))}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
        on ? "border-gold bg-gold text-black" : "border-line text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-glass p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-semibold ${
            value === v ? "bg-gold text-black" : "text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function OpportunityCard({
  o,
  open,
  onToggle,
}: {
  o: Opportunity;
  open: boolean;
  onToggle: () => void;
}) {
  const t = callTiming(o);
  return (
    <div className={`rounded-xl border ${t.tonight ? "border-gold/50" : "border-line"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left hover:bg-glass"
      >
        <span className="col-span-12 md:col-span-4 flex items-start gap-2 min-w-0">
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gold" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold text-fg">{o.hotel}</span>
            <span className="block text-sm text-muted">
              {o.city} · {o.supplySource === "wholesale" ? "Wholesale" : "Partner"}
              {o.contact?.phone ? ` · ${o.contact.phone}` : " · no contact yet"}
            </span>
          </span>
        </span>
        <span className="col-span-6 md:col-span-3 text-sm">
          <span className="block text-fg">{stayLabel(o)}</span>
          {t.countdown ? (
            <span className="block text-gold">{t.countdown}</span>
          ) : (
            <span className="block text-muted">
              {t.clock} hotel time · {t.hint}
            </span>
          )}
        </span>
        <span className="col-span-3 md:col-span-2 text-sm">
          <span className="block font-semibold text-fg">
            {money(o.bestBidPerNight)}/night
          </span>
          <span className="block text-muted">
            {o.memberFirstName} · {o.bidsInSession} bid{o.bidsInSession === 1 ? "" : "s"}
          </span>
        </span>
        <span className="col-span-3 md:col-span-3 flex flex-wrap items-center justify-end gap-2 text-sm">
          {o.gapPct != null ? (
            <span
              className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold"
              title="Internal only — never tell the hotel"
            >
              {o.gapPct}% under
            </span>
          ) : (
            <span className="rounded-full bg-glass px-2 py-0.5 text-muted">gap unknown</span>
          )}
          {!o.cardOnFile && (
            <span
              className="rounded-full border border-line px-2 py-0.5 text-xs text-muted"
              title="Wholesale bids are paid through Nuitée — don't say card on file"
            >
              no card on file
            </span>
          )}
          {o.lastCall && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg">
              Called: {OUTCOME_LABEL[o.lastCall.outcome]}
            </span>
          )}
        </span>
      </button>
      {open && <OpportunityDetail o={o} />}
    </div>
  );
}

function OpportunityDetail({ o }: { o: Opportunity }) {
  const queryClient = useQueryClient();
  const { data: hotel, refetch } = useApiQuery<{ contact: Contact | null; calls: DealCall[] }>({
    queryKey: ["deal-desk", "hotel", o.placeId],
    endpoint: getEndpoint(ENDPOINTS.DEAL_DESK_HOTEL, { placeId: o.placeId }),
  });
  const refreshAll = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["deal-desk"] });
  };
  const latestYes = hotel?.calls.find((c) => c.outcome === "YES" || c.outcome === "COUNTER");

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-line bg-bg/40 p-4 xl:grid-cols-3">
      <ContactCard o={o} contact={hotel?.contact ?? o.contact} onSaved={refreshAll} />
      <ScriptPanel o={o} contact={hotel?.contact ?? o.contact} />
      <OutcomeForm o={o} onLogged={refreshAll} />
      <div className="xl:col-span-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MemberFollowUp o={o} deal={latestYes ?? null} />
        <CallHistory calls={hotel?.calls ?? []} />
      </div>
    </div>
  );
}

function ContactCard({
  o,
  contact,
  onSaved,
}: {
  o: Opportunity;
  contact: Contact | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    notes: "",
  });
  useEffect(() => {
    setForm({
      name: contact?.name ?? "",
      role: contact?.role ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      notes: contact?.notes ?? "",
    });
  }, [contact]);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(getEndpoint(ENDPOINTS.DEAL_DESK_CONTACT, { placeId: o.placeId }), form);
      toast.success("Contact saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };
  const google = `https://www.google.com/search?q=${encodeURIComponent(`${o.hotel} ${o.city} phone`)}`;
  const field = (key: keyof typeof form, placeholder: string) => (
    <Input
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      placeholder={placeholder}
      className="bg-glass border-line text-fg"
    />
  );
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Hotel contact</p>
        <a
          href={google}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-gold underline"
        >
          Find on Google <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      {form.phone && (
        <a
          href={`tel:${form.phone.replace(/[^\d+]/g, "")}`}
          className="flex items-center gap-2 rounded-md bg-gold px-3 py-2 font-semibold text-black"
        >
          <Phone className="h-4 w-4" /> Call {form.phone}
        </a>
      )}
      {field("phone", "Phone (from Google / hotel site)")}
      {field("name", "Decision-maker name")}
      <select
        value={form.role}
        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        className="w-full rounded-md border border-line bg-glass px-3 py-2 text-sm text-fg"
      >
        <option value="">Role…</option>
        {["General Manager", "Revenue Manager", "Manager on duty", "Owner", "Front desk", "Other"].map(
          (r) => (
            <option key={r}>{r}</option>
          ),
        )}
      </select>
      {field("email", "Email")}
      <textarea
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        placeholder="Notes (best time to call, who to ask for…)"
        rows={2}
        className="w-full rounded-md border border-line bg-glass px-3 py-2 text-sm text-fg"
      />
      <Button onClick={() => void save()} disabled={saving} className="btn-bid w-full">
        {saving ? "Saving…" : "Save contact"}
      </Button>
    </div>
  );
}

function ScriptPanel({ o, contact }: { o: Opportunity; contact: Contact | null }) {
  const t = callTiming(o);
  const when = t.tonight
    ? "tonight"
    : `for ${format(new Date(`${o.checkInDate}T12:00:00`), "EEEE, MMMM d")}`;
  const nights = `${o.nights} night${o.nights === 1 ? "" : "s"}`;
  const ask = contact?.name
    ? `Is ${contact.name} available?`
    : t.tonight
      ? "Is the manager on duty available?"
      : "Who handles your rates, the GM or a revenue manager?";
  const guarantee = o.cardOnFile
    ? "They can pay at the desk, and I can guarantee it with their card."
    : "They can pay at the desk on arrival.";
  const [openObj, setOpenObj] = useState<number | null>(null);
  const objections: [string, string][] = [
    [
      "“We can't go below our Expedia / Booking rate.”",
      "It's a closed member rate, never shown publicly — the same kind of private rate airlines and Costco Travel use. It doesn't break your agreements with those sites.",
    ],
    [
      "“Have them walk in and ask.”",
      `They'll book somewhere ${t.tonight ? "tonight" : "for those dates"}. If you hold it at ${money(o.bestBidPerNight)} under their name, they'll come to you.`,
    ],
    [
      "“We can do $X.”",
      "That's their real floor — log it as a Counter. Close it if it's within what the member would pay; otherwise offer them an alternative.",
    ],
    [
      "“Email me.”",
      "Get their name and email and save them above — that's the contact we need. Send a short note the same day.",
    ],
    [
      "“Yes.”",
      "Book it under the guest's name, pay at desk. Then: “Can I send you requests like this by text when members are close to your price? You just reply yes or no — we only charge 7% on the ones you accept.”",
    ],
  ];
  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">Script</p>
      <p className="rounded-md bg-glass p-3 text-base leading-relaxed text-fg">
        &ldquo;Hi, this is Elvina with Deadline Travel. I have a verified member,{" "}
        {o.memberFirstName}, ready to book you <strong>{when}</strong>, {nights}, at{" "}
        <strong>{money(o.bestBidPerNight)}</strong> a night all-in. It&apos;s a private
        member rate, never published. {guarantee} {ask}&rdquo;
      </p>
      <ul className="text-xs text-muted space-y-1">
        <li>• Only say what&apos;s true — {o.cardOnFile ? "card on file is OK here." : "no card on file for this one."}</li>
        <li>• Never mention Nuitée or the % gap.</li>
      </ul>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">If they say…</p>
        {objections.map(([q, a], i) => (
          <div key={q} className="rounded-md border border-line">
            <button
              type="button"
              onClick={() => setOpenObj((cur) => (cur === i ? null : i))}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-fg"
            >
              {q}
              {openObj === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {openObj === i && <p className="px-3 pb-2 text-sm text-muted">{a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeForm({ o, onLogged }: { o: Opportunity; onLogged: () => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [directLead, setDirectLead] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsAmount = outcome === "YES" || outcome === "COUNTER";
  const submit = async () => {
    if (!outcome) return;
    if (needsAmount && !Number(amount)) {
      toast.error("Add the nightly amount they agreed to");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.DEAL_DESK_CALLS, {
        placeId: o.placeId,
        bidId: o.bestBidId,
        memberId: o.memberId,
        checkInDate: o.checkInDate,
        checkOutDate: o.checkOutDate,
        memberBidPerNight: o.bestBidPerNight,
        outcome,
        amountPerNight: needsAmount ? Number(amount) : null,
        reason: outcome === "NO" ? reason || null : null,
        notes: notes || null,
        directLead,
        callbackAt: outcome === "NO_ANSWER" && callbackAt ? new Date(callbackAt).toISOString() : null,
      });
      toast.success("Logged");
      setOutcome(null);
      setAmount("");
      setReason("");
      setNotes("");
      setCallbackAt("");
      setDirectLead(false);
      onLogged();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't log the call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">Log the call</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setOutcome(k);
              if (k === "YES" && !amount) setAmount(String(o.bestBidPerNight));
            }}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              outcome === k ? "border-gold bg-gold text-black" : "border-line text-fg"
            }`}
          >
            {OUTCOME_LABEL[k]}
          </button>
        ))}
      </div>
      {needsAmount && (
        <label className="block text-sm text-muted">
          {outcome === "YES" ? "Agreed" : "Their counter"} ($ per night)
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 bg-glass border-line text-fg"
          />
        </label>
      )}
      {outcome === "NO" && (
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-line bg-glass px-3 py-2 text-sm text-fg"
        >
          <option value="">Reason…</option>
          {NO_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      )}
      {outcome === "NO_ANSWER" && (
        <label className="block text-sm text-muted">
          Call back at
          <Input
            type="datetime-local"
            value={callbackAt}
            onChange={(e) => setCallbackAt(e.target.value)}
            className="mt-1 bg-glass border-line text-fg"
          />
        </label>
      )}
      {outcome && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className="w-full rounded-md border border-line bg-glass px-3 py-2 text-sm text-fg"
          />
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={directLead}
              onChange={(e) => setDirectLead(e.target.checked)}
            />
            Open to a direct listing
          </label>
          <Button onClick={() => void submit()} disabled={saving} className="btn-bid w-full">
            {saving ? "Saving…" : "Save outcome"}
          </Button>
        </>
      )}
    </div>
  );
}

function MemberFollowUp({ o, deal }: { o: Opportunity; deal: DealCall | null }) {
  const [alts, setAlts] = useState<
    | {
        id: string;
        slug: string;
        name: string;
        city: string;
        supplySource: string;
        minimumBid: number;
        retailPrice: number;
        km: number;
        starRating: number | null;
        guestRating: number | null;
      }[]
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const loadAlts = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<{ hotels: NonNullable<typeof alts> }>(
        `${getEndpoint(ENDPOINTS.DEAL_DESK_ALTERNATIVES, { placeId: o.placeId })}?maxPerNight=${o.bestBidPerNight}`,
      );
      setAlts(r.hotels);
    } catch {
      setAlts([]);
    } finally {
      setLoading(false);
    }
  };

  const agreed = deal ? Number(deal.amountPerNight) : null;
  const url = `${window.location.origin}${getPublicPlacePath({ slug: o.slug })}?date=${o.checkInDate}`;
  const subject = `Good news about ${o.hotel}`;
  const body = deal
    ? `Hi ${o.memberFirstName},\n\nGood news — I called ${o.hotel} about your stay (${stayLabel(o)}) and they ${
        deal.outcome === "YES" ? "accepted" : "came back with"
      } $${agreed} a night.\n\nWant it? Reply YES and I'll lock it in, or book it here: ${url}\n\nElvina\nDeadline Travel`
    : "";

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">
        Member follow-up
      </p>
      <p className="text-sm text-fg">
        {o.memberName ?? o.memberFirstName}
        <span className="text-muted"> · {o.memberEmail}</span>
      </p>
      {deal && o.memberEmail ? (
        <a
          href={`mailto:${o.memberEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black"
        >
          <Mail className="h-4 w-4" />
          Draft email: hotel {deal.outcome === "YES" ? "said yes" : "countered"} at ${agreed}
        </a>
      ) : (
        <p className="text-sm text-muted">
          Log a Yes or Counter and an email to the member is drafted here for you
          to review and send.
        </p>
      )}
      <div className="pt-1">
        <Button variant="secondary" size="sm" onClick={() => void loadAlts()} disabled={loading}>
          {loading ? "Finding…" : `Hotels nearby at ≤ ${money(o.bestBidPerNight)} member price`}
        </Button>
        {alts && alts.length === 0 && (
          <p className="mt-2 text-sm text-muted">Nothing nearby in that range.</p>
        )}
        {alts && alts.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {alts.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <a
                  href={getPublicPlacePath({ slug: h.slug })}
                  target="_blank"
                  rel="noreferrer"
                  className="text-fg hover:text-gold"
                >
                  {h.name}
                  <span className="text-muted">
                    {" "}
                    · {h.km} km · {h.supplySource === "direct" ? "Partner" : "Wholesale"}
                  </span>
                </a>
                <span className="text-muted whitespace-nowrap">
                  member ~{money(h.minimumBid)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">
          Member prices are from last night&apos;s refresh — check live before offering.
        </p>
      </div>
    </div>
  );
}

function CallHistory({ calls }: { calls: DealCall[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">
        History with this hotel
      </p>
      {calls.length === 0 && <p className="text-sm text-muted">No calls yet.</p>}
      <ul className="space-y-2">
        {calls.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="text-muted">
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              {format(new Date(c.createdAt), "MMM d, h:mm a")}
            </span>{" "}
            <span className="font-semibold text-fg">{OUTCOME_LABEL[c.outcome]}</span>
            {c.amountPerNight != null && (
              <span className="text-fg"> at {money(c.amountPerNight)}</span>
            )}
            {c.memberBidPerNight != null && (
              <span className="text-muted"> (member bid {money(c.memberBidPerNight)})</span>
            )}
            {c.reason && <span className="text-muted"> · {c.reason}</span>}
            {c.directLead && (
              <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                direct lead
              </span>
            )}
            {c.callbackAt && (
              <span className="text-muted">
                {" "}
                · call back {format(new Date(c.callbackAt), "MMM d, h:mm a")}
              </span>
            )}
            {c.notes && <p className="text-muted">{c.notes}</p>}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1 pt-1 text-xs text-muted">
        <CreditCard className="h-3.5 w-3.5" /> Results also show on the member&apos;s
        bid history (Bids → By member).
      </p>
    </div>
  );
}
