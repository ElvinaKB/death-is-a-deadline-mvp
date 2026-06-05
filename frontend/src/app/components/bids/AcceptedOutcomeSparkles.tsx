import { useEffect } from "react";
import confetti from "canvas-confetti";

const CELEBRATION_MS = 3_000;

/** Gold + emerald palette aligned with the accepted outcome panel. */
const COLORS = ["#d4af37", "#34d399", "#f8deb1", "#10b981", "#ffffff"];

/** Full-page side-cannon confetti when a bid is accepted (Magic UI pattern). */
export function AcceptedOutcomeSparkles() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    const end = Date.now() + CELEBRATION_MS;

    const frame = () => {
      if (cancelled || Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: COLORS,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: COLORS,
      });

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
