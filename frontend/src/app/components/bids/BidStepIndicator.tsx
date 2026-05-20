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
    <div className="bid-step-indicator" aria-label="Bid progress">
      {STEPS.map((step, i) => (
        <div
          key={step}
          className={`bid-step-dot ${
            i < currentIndex ? "done" : i === currentIndex ? "active" : ""
          }`}
          title={LABELS[step]}
        />
      ))}
    </div>
  );
}

export type { BidStep };
export { STEPS, LABELS };
