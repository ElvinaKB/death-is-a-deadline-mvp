import { useEffect, useMemo, useState, type CSSProperties } from "react";

/**
 * A looping, self-contained animation of the Deadline bid flow, shown in place
 * of the real bid form on a PREVIEW listing (a hotel viewing the listing we
 * built for them). It uses the listing's retail price to derive believable demo
 * numbers — the real confidential floor is never exposed — and walks through:
 * low bid → "not accepted" → +$20 → "not accepted" → +$20 → ACCEPTED + confetti,
 * then loops. No recording or per-listing asset needed.
 */
export function PreviewBidDemo({ retailPrice }: { retailPrice: number }) {
  // Derive a believable winning bid (~60% of retail, rounded to $5), then two
  // lower attempts $20 apart beneath it.
  const { start, mid, win } = useMemo(() => {
    const w = Math.max(40, Math.round((retailPrice * 0.6) / 5) * 5);
    return { start: w - 40, mid: w - 20, win: w };
  }, [retailPrice]);

  // Step machine. Each step: the shown bid, the result, whether the +$20 button
  // is "pressed", and how long to hold before advancing.
  const steps = useMemo(
    () => [
      { bid: start, status: "idle", press: false, ms: 1000 },
      { bid: start, status: "rejected", press: false, ms: 1200 },
      { bid: mid, status: "idle", press: true, ms: 1000 },
      { bid: mid, status: "rejected", press: false, ms: 1200 },
      { bid: win, status: "idle", press: true, ms: 1000 },
      { bid: win, status: "accepted", press: false, ms: 3000 },
    ],
    [start, mid, win],
  );

  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % steps.length), steps[i].ms);
    return () => clearTimeout(t);
  }, [i, steps]);

  const step = steps[i];
  const accepted = step.status === "accepted";
  const rejected = step.status === "rejected";

  return (
    <div className="rounded-xl border border-gold/40 bg-glass-2 p-5">
      <style>{`
        @keyframes dl-confetti-fall {
          0% { transform: translate(0,0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--dx), 120px) rotate(var(--dr)); opacity: 0; }
        }
        @keyframes dl-pop { 0%{transform:scale(.85);opacity:.4} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gold mb-1">
        How it works
      </p>
      <p className="text-center text-[11px] text-muted mb-4">
        A live look at the bidding game
      </p>

      {/* Dates row (static, illustrative) */}
      <div className="rounded-lg border border-line bg-bg/40 px-3 py-2 mb-3">
        <p className="text-[10px] uppercase tracking-wide text-muted">Your dates</p>
        <p className="text-sm font-semibold text-fg">2 nights · midweek</p>
      </div>

      {/* Bid amount */}
      <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
        Your bid / night
      </p>
      <div className="relative rounded-lg border border-line bg-bg/40 px-4 py-3 mb-3 overflow-hidden">
        <div
          key={step.bid + step.status}
          className="text-3xl font-bold tabular-nums text-fg"
          style={{ animation: "dl-pop .35s ease-out" }}
        >
          <span className="text-gold">$</span>
          {step.bid}
        </div>
        {accepted && <Confetti />}
      </div>

      {/* +$20 control */}
      <div
        className={`mb-3 flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
          step.press
            ? "border-gold bg-gold/20 text-gold scale-[0.97]"
            : "border-line text-muted"
        }`}
      >
        + $20
      </div>

      {/* Result banner */}
      <div className="h-11 flex items-center justify-center">
        {rejected && (
          <div className="w-full rounded-lg bg-red-500/15 border border-red-500/40 py-2 text-center text-sm font-semibold text-red-300">
            Not accepted — bid higher
          </div>
        )}
        {accepted && (
          <div className="w-full rounded-lg bg-emerald-500/15 border border-emerald-500/50 py-2 text-center text-sm font-bold text-emerald-300">
            🎉 Accepted — you won the room!
          </div>
        )}
        {step.status === "idle" && (
          <div className="w-full rounded-lg bg-bg/40 border border-line py-2 text-center text-sm text-muted">
            Checking the hotel's secret price…
          </div>
        )}
      </div>
    </div>
  );
}

/** Lightweight CSS confetti burst — no dependency. */
function Confetti() {
  const colors = ["#C9A24B", "#F5F3EE", "#1f7a35", "#e7b53c", "#93A4C9"];
  const pieces = Array.from({ length: 16 });
  return (
    <div className="pointer-events-none absolute inset-0">
      {pieces.map((_, k) => {
        const dx = `${Math.round((Math.random() - 0.5) * 220)}px`;
        const dr = `${Math.round((Math.random() - 0.5) * 720)}deg`;
        const left = `${Math.round(Math.random() * 100)}%`;
        const delay = `${Math.random() * 0.25}s`;
        const style = {
          position: "absolute",
          top: "40%",
          left,
          width: 7,
          height: 7,
          background: colors[k % colors.length],
          "--dx": dx,
          "--dr": dr,
          animation: `dl-confetti-fall 1.1s ease-in ${delay} forwards`,
          borderRadius: 1,
        } as CSSProperties;
        return <span key={k} style={style} />;
      })}
    </div>
  );
}
