import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { formatCurrency } from "../../../utils/currency";

/**
 * The preview-mode "show, don't tell" experience a hotel GM sees on a preview
 * link: an interactive demo of the bidding module plus a click-through tour
 * (verified → dates → bid vs. retail → instant book with card on file). Uses the
 * listing's retail to derive believable numbers; the real floor stays secret.
 */
type Status = "idle" | "rej" | "win";

export function PreviewExperience({ retailPrice }: { retailPrice: number }) {
  const { start, mid, win } = useMemo(() => {
    const w = Math.max(40, Math.round((retailPrice * 0.6) / 5) * 5);
    return { start: w - 40, mid: w - 20, win: w };
  }, [retailPrice]);

  const [bid, setBid] = useState(start);
  const [status, setStatus] = useState<Status>("idle");
  const [confettiKey, setConfettiKey] = useState(0);

  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [liVerified, setLiVerified] = useState(false);
  const [replayable, setReplayable] = useState(false);

  const datesRef = useRef<HTMLDivElement>(null);
  const bidRef = useRef<HTMLDivElement>(null);
  const modRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const bump = useCallback(() => setConfettiKey((k) => k + 1), []);

  // Ambient loop when not in the tour.
  useEffect(() => {
    if (tour) return;
    let i = 0;
    const seq: [number, Status][] = [
      [start, "idle"], [start, "rej"], [mid, "idle"],
      [mid, "rej"], [win, "idle"], [win, "win"],
    ];
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const [b, s] = seq[i % seq.length];
      setBid(b); setStatus(s);
      if (s === "win") bump();
      i++;
      timers.current.push(window.setTimeout(tick, s === "win" ? 3000 : 1100));
    };
    tick();
    return () => { alive = false; clearTimers(); };
  }, [tour, start, mid, win, bump]);

  // Win playthrough during tour step 4.
  const playWin = useCallback(() => {
    clearTimers();
    const seq: [number, Status, number][] = [
      [start, "idle", 700], [start, "rej", 900], [mid, "idle", 600],
      [mid, "rej", 900], [win, "idle", 600], [win, "win", 3000],
    ];
    let i = 0;
    const tick = () => {
      const s = seq[i]; if (!s) return;
      setBid(s[0]); setStatus(s[1]);
      if (s[1] === "win") bump();
      i++;
      if (i < seq.length) after(s[2], tick);
    };
    tick();
  }, [start, mid, win, bump]);

  const steps = useMemo(
    () => [
      { key: "verify", label: "STEP 1 OF 4", title: "Verified travelers only",
        body: "Every traveler is identity-checked — LinkedIn, a .edu, or a corporate email. No anonymous bargain-hunters.",
        target: null as RefObject<HTMLDivElement> | null },
      { key: "dates", label: "STEP 2 OF 4", title: "They pick their dates",
        body: "The traveler chooses the exact nights they want — the empty ones you want to fill.",
        target: datesRef },
      { key: "bid", label: "STEP 3 OF 4", title: "They bid against your retail",
        body: "They see your public retail rate and bid what they’ll pay — blind. Your secret minimum never shows.",
        target: bidRef },
      { key: "win", label: "STEP 4 OF 4", title: "Instant book — card on file",
        body: "Bids under your secret price bounce instantly. The moment one clears it, the card on file is charged and the room is won.",
        target: modRef },
    ],
    [],
  );

  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const t = steps[step]?.target?.current;
    const pop = popRef.current;
    const ph = pop?.offsetHeight ?? 180;
    const pw = pop?.offsetWidth ?? 320;
    let top = window.innerHeight / 2;
    let cx = window.innerWidth / 2;
    if (t) {
      const r = t.getBoundingClientRect();
      top = r.bottom + 14;
      cx = r.left + r.width / 2;
    } else {
      top = window.innerHeight * 0.5 + 120;
    }
    top = Math.max(16, Math.min(top, window.innerHeight - ph - 16));
    const left = Math.max(16, Math.min(cx - pw / 2, window.innerWidth - pw - 16));
    setPopPos({ top, left });
  }, [step, steps]);

  // On step change during tour: run side effects + reposition.
  useEffect(() => {
    if (!tour) return;
    if (steps[step].key === "verify") {
      setLiVerified(false);
      after(900, () => setLiVerified(true));
    }
    if (steps[step].key === "win") playWin();
    const raf = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, step]);

  useEffect(() => {
    if (!tour) return;
    const h = () => reposition();
    window.addEventListener("resize", h);
    window.addEventListener("scroll", h, true);
    return () => {
      window.removeEventListener("resize", h);
      window.removeEventListener("scroll", h, true);
    };
  }, [tour, reposition]);

  const startTour = () => { clearTimers(); setStep(0); setTour(true); };
  const endTour = () => { clearTimers(); setTour(false); setReplayable(true); };
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : endTour());
  const back = () => step > 0 && setStep(step - 1);

  const activeTarget = tour ? steps[step].target?.current : null;
  const spot = (ref: RefObject<HTMLDivElement>): CSSProperties =>
    tour && activeTarget === ref.current
      ? { position: "relative", zIndex: 60, boxShadow:
          "0 0 0 2px hsl(40 78% 52%), 0 0 0 8px hsl(40 78% 52% / .15), 0 0 40px hsl(40 78% 52% / .5)", borderRadius: 14 }
      : {};

  const cur = (n: number) => formatCurrency(n);

  return (
    <div>
      <style>{`
        @keyframes dl-fall{to{transform:translate(var(--dx),140px) rotate(var(--dr));opacity:0}}
        .dl-confetti i{position:absolute;top:30%;width:7px;height:7px;border-radius:1px;animation:dl-fall 1.1s ease-in forwards}
      `}</style>

      <button className="btn-bid-premium h-11 px-5 text-sm uppercase tracking-wider mb-3" onClick={startTour}>
        ▶ See how it works
      </button>
      {replayable && (
        <button className="ml-3 text-sm font-semibold text-gold underline" onClick={startTour}>
          Replay
        </button>
      )}

      {/* Demo module */}
      <div
        ref={modRef}
        style={spot(modRef)}
        className="rounded-2xl border border-gold/40 bg-glass-2 p-4"
      >
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-gold">How it works</p>
        <p className="text-center text-[11px] text-muted mb-3">A live look at the bidding game</p>

        <div ref={datesRef} style={spot(datesRef)} className="rounded-xl border border-line bg-bg/40 px-3 py-2 mb-2">
          <div className="text-[9px] uppercase tracking-wide text-muted">Your dates</div>
          <div className="text-sm font-semibold text-fg">2 nights · midweek</div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
          <span>Public retail</span>
          <span className="font-serif text-fg">{cur(retailPrice)} / night</span>
        </div>

        <div ref={bidRef} style={spot(bidRef)} className="relative overflow-hidden rounded-xl border border-line bg-bg/40 px-4 py-3 mb-2">
          <div className="text-[9px] uppercase tracking-wide text-muted">Your bid / night</div>
          <div className="font-serif text-3xl text-fg">
            <span className="text-gold">$</span>{bid}
          </div>
          {status === "win" && <Confetti key={confettiKey} />}
        </div>

        <div className="rounded-xl border border-line bg-bg/40 px-4 py-3 mb-2">
          <div className="text-[9px] uppercase tracking-wide text-muted">Card on file</div>
          <div className="flex items-center gap-2 text-[15px] tracking-wider text-fg">
            <span className="rounded-sm bg-[#1a1f71] px-1.5 py-0.5 text-[9px] font-extrabold text-white">VISA</span>
            •••• •••• •••• 4242
          </div>
        </div>

        <Banner status={status} />
      </div>

      {/* Tour overlay */}
      {tour &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40 bg-black/80" />
            <button
              className="fixed right-4 top-4 z-[70] rounded-full border border-line bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-muted"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              onClick={endTour}
            >
              Skip tour ✕
            </button>

            {steps[step].key === "verify" && <LinkedInPopup verified={liVerified} onVerify={() => setLiVerified(true)} />}

            <div
              ref={popRef}
              className="fixed z-[70] w-[calc(100%-32px)] max-w-[340px] rounded-2xl border border-gold/40 bg-glass-2 p-5 shadow-2xl"
              style={{ top: popPos.top, left: popPos.left }}
            >
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{steps[step].label}</div>
              <h3 className="mb-1.5 font-serif text-xl text-fg">{steps[step].title}</h3>
              <p className="mb-4 text-sm text-muted">{steps[step].body}</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1.5">
                  {steps.map((_, k) => (
                    <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === step ? "bg-gold" : "bg-line"}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-fg"
                    style={{ visibility: step === 0 ? "hidden" : "visible" }}
                    onClick={back}
                  >
                    Back
                  </button>
                  <button className="btn-bid-premium rounded-lg px-4 py-2 text-sm" onClick={next}>
                    {step === steps.length - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function Banner({ status }: { status: Status }) {
  if (status === "rej")
    return (
      <div className="flex min-h-[44px] items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 px-2 text-center text-sm font-semibold text-red-300">
        Not accepted — bid higher
      </div>
    );
  if (status === "win")
    return (
      <div className="flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-2 text-center text-sm font-bold text-emerald-300">
        🎉 Accepted — card charged, room won
      </div>
    );
  return (
    <div className="flex min-h-[44px] items-center justify-center rounded-xl border border-line bg-bg/40 px-2 text-center text-sm text-muted">
      Checking the hotel&rsquo;s secret price…
    </div>
  );
}

function Confetti() {
  const colors = ["#e0b45b", "#F5F3EE", "#54d08a", "#c99a3a", "#93A4C9"];
  return (
    <div className="dl-confetti pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: 16 }).map((_, k) => {
        const style = {
          left: `${Math.round(Math.random() * 100)}%`,
          background: colors[k % colors.length],
          "--dx": `${Math.round((Math.random() - 0.5) * 200)}px`,
          "--dr": `${Math.round((Math.random() - 0.5) * 720)}deg`,
          animationDelay: `${Math.random() * 0.25}s`,
        } as CSSProperties;
        return <i key={k} style={style} />;
      })}
    </div>
  );
}

function LinkedInPopup({ verified, onVerify }: { verified: boolean; onVerify: () => void }) {
  return (
    <div className="fixed left-1/2 top-1/3 z-[65] w-[min(320px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-[18px] text-[#1b1b1b] shadow-2xl">
      <div className="flex items-center gap-2 text-base font-bold text-[#0A66C2]">
        <span className="rounded bg-[#0A66C2] px-1.5 py-px text-[13px] font-extrabold text-white">in</span>
        Verify your identity
      </div>
      <div className="my-3.5 flex items-center gap-2.5 rounded-xl border border-[#e6e6e6] p-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0A66C2] to-[#63b3ff] font-extrabold text-white">MR</div>
        <div>
          <div className="text-sm font-bold">Verified traveler</div>
          <div className="text-xs text-[#666]">Corporate · LinkedIn · .edu</div>
        </div>
      </div>
      {verified ? (
        <div className="text-center text-[15px] font-extrabold text-[#0a7d3c]">✓ Verified — welcome to Deadline</div>
      ) : (
        <button className="w-full rounded-full bg-[#0A66C2] py-2.5 text-sm font-bold text-white" onClick={onVerify}>
          Verify with LinkedIn
        </button>
      )}
    </div>
  );
}
