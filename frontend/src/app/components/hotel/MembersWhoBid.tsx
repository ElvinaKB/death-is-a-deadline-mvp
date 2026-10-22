import { useState } from "react";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { Badge } from "../../components/ui/badge";
import {
  PlaceSummarySession,
  SessionOutcome,
} from "../../../types/placeSummary.types";

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(n);

const fmtDate = (iso: string, pattern: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : format(d, pattern);
};

const OUTCOME: Record<SessionOutcome, { label: string; className: string }> = {
  BOOKED: { label: "Booked", className: "bg-success/20 text-success" },
  WALKED_AWAY: { label: "Walked away", className: "bg-warning/20 text-warning" },
  NO_EXIT_RECORDED: { label: "No decision", className: "bg-muted/20 text-muted" },
};

interface MemberGroup {
  key: string;
  name: string;
  verifiedVia: string;
  sessions: PlaceSummarySession[];
  totalBids: number;
  booked: number;
  bestPerNight: number;
  lastBidAt: string;
}

function groupByMember(sessions: PlaceSummarySession[]): MemberGroup[] {
  const map = new Map<string, MemberGroup>();
  for (const s of sessions) {
    const key = s.memberKey || s.sessionId;
    const g =
      map.get(key) ??
      ({
        key,
        name: s.firstName || "Member",
        verifiedVia: s.verifiedVia,
        sessions: [],
        totalBids: 0,
        booked: 0,
        bestPerNight: 0,
        lastBidAt: s.lastBidAt,
      } as MemberGroup);
    g.sessions.push(s);
    g.totalBids += s.bidCount;
    if (s.outcome === "BOOKED") g.booked += 1;
    g.bestPerNight = Math.max(g.bestPerNight, s.bestBidPerNight);
    if (new Date(s.lastBidAt) > new Date(g.lastBidAt)) g.lastBidAt = s.lastBidAt;
    map.set(key, g);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.lastBidAt).getTime() - new Date(a.lastBidAt).getTime(),
  );
}

export function MembersWhoBid({
  sessions,
}: {
  sessions: PlaceSummarySession[];
}) {
  const groups = groupByMember(sessions);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-glass-2 p-6 text-center">
        <p className="text-sm text-muted">
          No members have bid on this listing yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-line bg-glass-2">
        <p className="text-sm font-semibold text-fg">
          Members who bid ({groups.length})
        </p>
        <p className="text-xs text-muted mt-0.5">
          Every bidder is an ID- or affiliation-verified Deadline member. Tap a
          member to see each bidding session.
        </p>
      </div>

      <div className="divide-y divide-line">
        {groups.map((g) => {
          const isOpen = open.has(g.key);
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-glass transition-colors"
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted shrink-0 transition-transform",
                    isOpen && "rotate-90",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg truncate">
                    {g.name}
                  </p>
                  <p className="text-xs text-gold truncate">{g.verifiedVia}</p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-sm text-fg">{money(g.bestPerNight)}/night</p>
                  <p className="text-xs text-muted">best offer</p>
                </div>
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm text-fg">
                    {g.totalBids} bid{g.totalBids === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted">
                    {g.booked > 0 ? `${g.booked} booked` : "—"}
                  </p>
                </div>
                <div className="hidden md:block text-right shrink-0 w-28">
                  <p className="text-xs text-muted">
                    {fmtDate(g.lastBidAt, "MMM d, h:mm a")}
                  </p>
                </div>
              </button>

              {isOpen && (
                <div className="bg-bg/60 px-4 sm:px-5 pb-3">
                  <div className="divide-y divide-line/60">
                    {g.sessions.map((s) => (
                      <div
                        key={s.sessionId}
                        className="flex items-center gap-3 py-2.5 text-xs sm:text-sm"
                      >
                        <span className="text-muted w-28 shrink-0">
                          {fmtDate(s.startedAt, "MMM d, h:mm a")}
                        </span>
                        <span className="text-fg flex-1 min-w-0 truncate">
                          {fmtDate(s.checkInDate, "MMM d")} →{" "}
                          {fmtDate(s.checkOutDate, "MMM d, yyyy")}
                        </span>
                        <span className="text-fg shrink-0 tabular-nums">
                          {s.firstBidPerNight !== s.finalBidPerNight ? (
                            <>
                              <span className="text-muted">
                                {money(s.firstBidPerNight)}
                              </span>{" "}
                              → {money(s.finalBidPerNight)}
                            </>
                          ) : (
                            money(s.finalBidPerNight)
                          )}
                          <span className="text-muted">/night</span>
                        </span>
                        <Badge
                          className={cn(
                            "text-[11px] shrink-0",
                            OUTCOME[s.outcome].className,
                          )}
                        >
                          {OUTCOME[s.outcome].label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
