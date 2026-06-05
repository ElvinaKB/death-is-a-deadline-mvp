import { useEffect } from "react";
import confetti from "canvas-confetti";

const CELEBRATION_MS = 3_000;

/** Gold + emerald palette aligned with the accepted outcome panel. */
const COLORS = ["#d4af37", "#34d399", "#f8deb1", "#10b981", "#ffffff"];

const CANNON_DEFAULTS = {
  particleCount: 2,
  spread: 55,
  startVelocity: 60,
  colors: COLORS,
  zIndex: 9999,
  disableForReducedMotion: false,
} as const;

/** Full-page side-cannon confetti when a bid is accepted (Magic UI pattern). */
export function AcceptedOutcomeSparkles() {
  useEffect(() => {
    let cancelled = false;
    const end = Date.now() + CELEBRATION_MS;

    const frame = () => {
      if (cancelled || Date.now() > end) return;

      confetti({
        ...CANNON_DEFAULTS,
        angle: 60,
        origin: { x: 0, y: 0.5 },
      });
      confetti({
        ...CANNON_DEFAULTS,
        angle: 120,
        origin: { x: 1, y: 0.5 },
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
