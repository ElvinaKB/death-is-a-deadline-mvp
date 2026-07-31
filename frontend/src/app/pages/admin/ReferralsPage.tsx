import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS, getEndpoint } from "../../../config/endpoints.config";
import { apiClient } from "../../../lib/apiClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

interface ReferrerHotel {
  placeId: string;
  name: string;
  city: string;
  bookings: number;
  gross: number;
  earning: number;
}
interface Referrer {
  id: string;
  displayName: string;
  email: string;
  splitPercent: number;
  taxStatus: string;
  totalEarnings: number;
  bookingCount: number;
  hotelCount: number;
  hotels: ReferrerHotel[];
}
interface ReferrersResponse {
  referrers: Referrer[];
  total: number;
}
interface PlaceLite {
  id: string;
  name: string;
  city: string;
}
interface PlacesResponse {
  places: PlaceLite[];
  total: number;
}

const fmt$ = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

export function ReferralsPage() {
  const queryClient = useQueryClient();
  const { data: refData, isLoading } = useApiQuery<ReferrersResponse>({
    queryKey: ["referrers"],
    endpoint: ENDPOINTS.REFERRERS,
  });
  const { data: placesData } = useApiQuery<PlacesResponse>({
    queryKey: ["referrer-places"],
    endpoint: ENDPOINTS.PLACES_LIST,
    params: { limit: 100 },
  });

  const referrers = refData?.referrers ?? [];
  const places = placesData?.places ?? [];

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [split, setSplit] = useState("3.5");
  const [demoPassword, setDemoPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createReferrer = async () => {
    if (!email || !name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post(ENDPOINTS.REFERRERS, {
        email,
        displayName: name,
        splitPercent: Number(split) || 3.5,
        ...(demoPassword.trim() ? { demoPassword: demoPassword.trim() } : {}),
      });
      setEmail("");
      setName("");
      setSplit("3.5");
      setDemoPassword("");
      queryClient.invalidateQueries({ queryKey: ["referrers"] });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to add referrer");
    } finally {
      setCreating(false);
    }
  };

  const [assignPlace, setAssignPlace] = useState("");
  const [assignReferrer, setAssignReferrer] = useState("");
  const [assigning, setAssigning] = useState(false);

  const assign = async () => {
    if (!assignPlace || !assignReferrer) return;
    setAssigning(true);
    try {
      await apiClient.patch(
        getEndpoint(ENDPOINTS.REFERRER_ASSIGN_PLACE, { id: assignPlace }),
        { referrerId: assignReferrer },
      );
      setAssignPlace("");
      setAssignReferrer("");
      queryClient.invalidateQueries({ queryKey: ["referrers"] });
    } finally {
      setAssigning(false);
    }
  };

  const [pwMap, setPwMap] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<Record<string, string>>({});

  const setPassword = async (id: string) => {
    const pw = (pwMap[id] ?? "").trim();
    if (pw.length < 6) {
      setPwMsg((m) => ({ ...m, [id]: "Min 6 characters" }));
      return;
    }
    setPwSaving(id);
    setPwMsg((m) => ({ ...m, [id]: "" }));
    try {
      await apiClient.post(
        getEndpoint(ENDPOINTS.REFERRER_SET_PASSWORD, { id }),
        { password: pw },
      );
      setPwMsg((m) => ({ ...m, [id]: "✓ Password set — they can log in now" }));
      setPwMap((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      setPwMsg((m) => ({
        ...m,
        [id]: e instanceof Error ? e.message : "Failed to set password",
      }));
    } finally {
      setPwSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg flex items-center gap-2">
          <Handshake className="h-7 w-7 text-brand" /> Referrals
        </h1>
        <p className="text-muted mt-1">
          Affiliate partners who refer hotels earn a share of Deadline's
          commission on those hotels' bookings for 12 months.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-glass px-4 py-3 text-sm text-muted">
        <span className="text-fg font-medium">Payout timing:</span> referral
        earnings are paid <span className="text-fg">72 hours after the guest
        checks out</span>, plus bank processing (ACH typically lands in 1–3
        business days). Payout requires the referrer's tax details (W-9) on file.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-glass border-line">
          <CardHeader>
            <CardTitle className="text-fg text-base">Add a referrer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted">
              They must already have a traveler account (they log in to see
              their portal and can also bid).
            </p>
            <div className="space-y-1.5">
              <Label className="text-fg">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="referral@influencer.com"
                className="bg-bg border-line text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fg">Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane the Influencer"
                className="bg-bg border-line text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fg">Split % of booking total</Label>
              <Input
                value={split}
                onChange={(e) => setSplit(e.target.value)}
                className="bg-bg border-line text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fg">Demo login password (optional)</Label>
              <Input
                value={demoPassword}
                onChange={(e) => setDemoPassword(e.target.value)}
                placeholder="Leave blank for real affiliates"
                className="bg-bg border-line text-fg"
              />
              <p className="text-[11px] text-muted leading-snug">
                Real affiliates: leave blank — they get a "set your password"
                email. Only set this for a demo account you can't email-verify
                (min 8 chars); you'll log in with this password.
              </p>
            </div>
            {createError && <p className="text-sm text-danger">{createError}</p>}
            <Button
              onClick={createReferrer}
              disabled={creating || !email || !name}
              className="w-full"
            >
              {creating ? "Adding…" : "Add referrer"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-glass border-line">
          <CardHeader>
            <CardTitle className="text-fg text-base">
              Attach a hotel to a referrer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted">
              Starts the 12-month referral window now.
            </p>
            <div className="space-y-1.5">
              <Label className="text-fg">Hotel</Label>
              <select
                value={assignPlace}
                onChange={(e) => setAssignPlace(e.target.value)}
                className="w-full rounded-md bg-bg border border-line text-fg px-3 py-2"
              >
                <option value="">Select a hotel…</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-fg">Referrer</Label>
              <select
                value={assignReferrer}
                onChange={(e) => setAssignReferrer(e.target.value)}
                className="w-full rounded-md bg-bg border border-line text-fg px-3 py-2"
              >
                <option value="">Select a referrer…</option>
                {referrers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={assign}
              disabled={assigning || !assignPlace || !assignReferrer}
              className="w-full"
            >
              {assigning ? "Attaching…" : "Attach hotel"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-glass border-line">
        <CardHeader>
          <CardTitle className="text-fg">
            Referrers ({referrers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted">Loading…</p>
          ) : referrers.length === 0 ? (
            <p className="text-muted">No referrers yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {referrers.map((r) => (
                <div key={r.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-fg font-semibold">{r.displayName}</p>
                      <p className="text-sm text-muted">{r.email}</p>
                      <p className="text-xs text-muted mt-1">
                        {r.splitPercent}% split · tax{" "}
                        {r.taxStatus === "submitted"
                          ? "✓ on file"
                          : "not submitted"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-fg">
                        {fmt$(r.totalEarnings)}
                      </p>
                      <p className="text-xs text-muted">
                        {r.bookingCount} booking
                        {r.bookingCount === 1 ? "" : "s"} · {r.hotelCount} hotel
                        {r.hotelCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {r.hotels.length > 0 && (
                    <div className="mt-3 border-t border-line/50 pt-3 space-y-1">
                      {r.hotels.map((h) => (
                        <div
                          key={h.placeId}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-fg">
                            {h.name}{" "}
                            <span className="text-muted">· {h.city}</span>
                          </span>
                          <span className="text-muted">
                            {h.bookings} booking{h.bookings === 1 ? "" : "s"} ·{" "}
                            {fmt$(h.earning)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 border-t border-line/50 pt-3 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[180px] space-y-1">
                      <Label className="text-xs text-muted">
                        Set login password (for demo accounts)
                      </Label>
                      <Input
                        type="text"
                        value={pwMap[r.id] ?? ""}
                        onChange={(e) =>
                          setPwMap((m) => ({ ...m, [r.id]: e.target.value }))
                        }
                        placeholder="min 6 characters"
                        className="bg-bg border-line text-fg"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      disabled={pwSaving === r.id}
                      onClick={() => setPassword(r.id)}
                    >
                      {pwSaving === r.id ? "Setting…" : "Set password"}
                    </Button>
                    {pwMsg[r.id] && (
                      <span className="w-full text-xs text-muted">
                        {pwMsg[r.id]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
