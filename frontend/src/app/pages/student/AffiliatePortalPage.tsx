import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Handshake, Loader2, MapPin } from "lucide-react";
import { HomeHeader } from "../../components/home";
import { useMyReferrer } from "../../../hooks/useMyReferrer";
import { apiClient } from "../../../lib/apiClient";
import { ENDPOINTS } from "../../../config/endpoints.config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const fmt$ = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

export function AffiliatePortalPage() {
  const { data: referrer, isLoading } = useMyReferrer();
  const queryClient = useQueryClient();

  const [legalName, setLegalName] = useState("");
  const [classification, setClassification] = useState("individual");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);

  const submitTax = async () => {
    if (!legalName) {
      setTaxError("Legal name is required");
      return;
    }
    setSubmitting(true);
    setTaxError(null);
    try {
      await apiClient.post(ENDPOINTS.MY_REFERRER_TAX, {
        taxLegalName: legalName,
        taxClassification: classification,
        taxAddress: address,
      });
      queryClient.invalidateQueries({ queryKey: ["my-referrer"] });
    } catch (e) {
      setTaxError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader variant="dark" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-fg flex items-center gap-2">
            <Handshake className="h-7 w-7 text-brand" /> My Referrals
          </h1>
          <p className="text-muted mt-1">
            Earn {referrer?.splitPercent ?? 3.5}% of every booking on the hotels
            you refer, for 12 months.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : !referrer ? (
          <Card className="bg-glass border-line">
            <CardContent className="py-10 text-center text-muted">
              You're not an affiliate yet. Ask the Deadline team to add you.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="bg-glass border-line">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Total earned
                  </p>
                  <p className="text-2xl font-bold text-fg mt-1">
                    {fmt$(referrer.totalEarnings)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-glass border-line">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Bookings
                  </p>
                  <p className="text-2xl font-bold text-fg mt-1">
                    {referrer.bookingCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-glass border-line">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Hotels referred
                  </p>
                  <p className="text-2xl font-bold text-fg mt-1">
                    {referrer.hotels.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg border border-line bg-glass px-4 py-3 text-sm text-muted">
              <span className="text-fg font-medium">When you get paid:</span>{" "}
              earnings are paid{" "}
              <span className="text-fg">72 hours after the guest checks out</span>
              , plus bank processing (ACH typically 1–3 business days). Your tax
              details (W-9) must be on file before payouts.
            </div>

            <Card className="bg-glass border-line">
              <CardHeader>
                <CardTitle className="text-fg text-base">
                  Tax details{" "}
                  {referrer.taxStatus === "submitted"
                    ? "✓"
                    : "(required for payout)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referrer.taxStatus === "submitted" ? (
                  <p className="text-sm text-success">
                    ✓ Your tax details are on file — payouts are enabled once you
                    have earnings past the payout window.
                  </p>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <p className="text-xs text-muted">
                      Referral earnings are taxable income, so we collect a W-9
                      before paying out.{" "}
                      <span className="text-fg">
                        Don't enter your SSN here
                      </span>{" "}
                      — we'll request your TIN securely at payout time.
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-fg">Legal name</Label>
                      <Input
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        className="bg-bg border-line text-fg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-fg">Tax classification</Label>
                      <select
                        value={classification}
                        onChange={(e) => setClassification(e.target.value)}
                        className="w-full rounded-md bg-bg border border-line text-fg px-3 py-2"
                      >
                        <option value="individual">
                          Individual / sole proprietor
                        </option>
                        <option value="business">
                          Business / LLC / corporation
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-fg">Mailing address</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-bg border-line text-fg"
                      />
                    </div>
                    {taxError && (
                      <p className="text-sm text-danger">{taxError}</p>
                    )}
                    <Button
                      onClick={submitTax}
                      disabled={submitting || !legalName}
                    >
                      {submitting ? "Saving…" : "Submit tax details"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-glass border-line">
              <CardHeader>
                <CardTitle className="text-fg text-base">
                  Your referred hotels
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referrer.hotels.length === 0 ? (
                  <p className="text-muted text-sm">
                    No hotels attributed to you yet. Once a hotel you referred is
                    listed, its bookings and your earnings show up here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {referrer.hotels.map((h) => (
                      <div
                        key={h.placeId}
                        className="flex justify-between items-center text-sm border-b border-line/40 last:border-0 pb-2 last:pb-0"
                      >
                        <span className="text-fg flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted" /> {h.name}{" "}
                          <span className="text-muted">· {h.city}</span>
                        </span>
                        <span className="text-muted">
                          {h.bookings} booking{h.bookings === 1 ? "" : "s"} ·{" "}
                          <span className="text-fg font-medium">
                            {fmt$(h.earning)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
