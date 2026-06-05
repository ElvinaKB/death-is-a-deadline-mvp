import { useMemo, type CSSProperties } from "react";

const SPARKLE_COUNT = 22;

type SparkleVariant = "gold" | "emerald" | "white";
type SparkleShape = "dot" | "star";

function buildSparkles() {
  return Array.from({ length: SPARKLE_COUNT }, (_, index) => {
    const left = 6 + ((index * 37) % 88);
    const delay = (index * 0.11) % 2.1;
    const duration = 1.35 + (index % 4) * 0.18;
    const drift = (index % 2 === 0 ? 1 : -1) * (4 + (index % 5) * 3);
    const size = index % 5 === 0 ? 4 : index % 3 === 0 ? 3 : 2;
    const variant: SparkleVariant =
      index % 3 === 0 ? "gold" : index % 3 === 1 ? "emerald" : "white";
    const shape: SparkleShape = index % 4 === 0 ? "star" : "dot";

    return {
      id: index,
      left: `${left}%`,
      delay: `${delay.toFixed(2)}s`,
      duration: `${duration.toFixed(2)}s`,
      drift: `${drift}px`,
      size,
      variant,
      shape,
    };
  });
}

export function AcceptedOutcomeSparkles() {
  const sparkles = useMemo(buildSparkles, []);

  return (
    <div className="outcome-sparkles" aria-hidden>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className={[
            "outcome-sparkle",
            `outcome-sparkle--${sparkle.variant}`,
            sparkle.shape === "star" ? "outcome-sparkle--star" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            {
              left: sparkle.left,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              "--sparkle-delay": sparkle.delay,
              "--sparkle-duration": sparkle.duration,
              "--sparkle-drift": sparkle.drift,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
