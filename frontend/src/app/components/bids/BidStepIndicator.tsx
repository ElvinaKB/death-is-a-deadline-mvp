type BidStep = "dates" | "amount" | "review" | "payment";

const STEPS: BidStep[] = ["dates", "amount", "review", "payment"];
const LABELS: Record<BidStep, string> = {
  dates: "Dates",
  amount: "Your bid",
  review: "Review",
  payment: "Pay & submit",
};

export function BidStepIndicator({ current }: { current: BidStep }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <div
      className="bid-step-indicator"
      role="list"
      aria-label={`Bid progress, step ${currentIndex + 1} of ${STEPS.length}: ${LABELS[current]}`}
    >
      {STEPS.map((step, i) => (
        <div
          key={step}
          role="listitem"
          className={`bid-step-dot ${
            i < currentIndex ? "done" : i === currentIndex ? "active" : ""
          }`}
          aria-current={i === currentIndex ? "step" : undefined}
          aria-label={`${LABELS[step]}${i < currentIndex ? ", completed" : i === currentIndex ? ", current" : ""}`}
          title={LABELS[step]}
        />
      ))}
      <span className="sr-only">
        Step {currentIndex + 1} of {STEPS.length}: {LABELS[current]}
      </span>
    </div>
  );
}

export type { BidStep };
export { STEPS, LABELS };
