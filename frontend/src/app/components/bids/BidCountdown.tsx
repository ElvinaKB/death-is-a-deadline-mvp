import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "../ui/utils";

export function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** On hero image — red live dot + countdown copy */
export function ImageBidCountdown({ className = "" }: { className?: string }) {
  const [remaining, setRemaining] = useState(() => getSecondsUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs backdrop-blur-sm",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-urgent animate-pulse" />
      <span className="text-fg">
        Bidding closes in{" "}
        <span className="timer-urgent font-semibold">{formatHMS(remaining)}</span>
      </span>
    </div>
  );
}

/** Listing bid panel — title + timer in one block (mockup) */
export function ListingBidPanelHeader({ className = "" }: { className?: string }) {
  const [remaining, setRemaining] = useState(() => getSecondsUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("listing-bid-header", className)}>
      <h2 className="listing-bid-panel-title text-fg uppercase text-center">
        Place your bid.
      </h2>
      <div className="listing-bid-timer-row mt-3">
        <div className="listing-bid-timer-row__label">
          <Clock className="h-4 w-4 shrink-0 text-fg" strokeWidth={1.5} />
          <span className="text-xs text-fg leading-snug">
            Auction closes at midnight hotel time
          </span>
        </div>
        <span className="listing-bid-panel-timer shrink-0">
          {formatHMS(remaining)}
        </span>
      </div>
    </div>
  );
}

/** Sidebar — large gold auction timer */
export function SidebarAuctionTimer({ className = "" }: { className?: string }) {
  const [remaining, setRemaining] = useState(() => getSecondsUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("gold-border rounded-lg p-4 text-center", className)}>
      <Clock className="mx-auto mb-2 h-6 w-6 text-gold" strokeWidth={1.5} />
      <p className="text-xs text-muted mb-1">
        Auction closes at midnight hotel time
      </p>
      <p className="timer-gold-lg">{formatHMS(remaining)}</p>
    </div>
  );
}

/** @deprecated Use ImageBidCountdown or SidebarAuctionTimer */
export function BidCountdown(props: { className?: string }) {
  return <SidebarAuctionTimer {...props} />;
}
