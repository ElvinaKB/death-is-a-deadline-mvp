import { format } from "date-fns";
import { PriorStaySummary } from "../../../types/bid.types";
import { cn } from "../ui/utils";

interface PriorStayBannerProps {
  priorStay: PriorStaySummary;
  className?: string;
  /** Compact pill for listing hero */
  variant?: "card" | "pill";
}

export function PriorStayBanner({
  priorStay,
  className,
  variant = "card",
}: PriorStayBannerProps) {
  const checkIn = new Date(priorStay.checkInDate);
  const checkOut = new Date(priorStay.checkOutDate);

  const content = (
    <>
      You stayed here{" "}
      <span className="text-fg font-medium">
        {format(checkIn, "MMM d")}–{format(checkOut, "MMM d, yyyy")}
      </span>{" "}
      for{" "}
      <span className="text-fg font-medium">${priorStay.bidPerNight}/night</span>
      . Bid again for a new stay.
    </>
  );

  if (variant === "pill") {
    return (
      <p
        className={cn(
          "rounded-full border border-line/80 bg-black/50 px-4 py-2 text-xs sm:text-sm text-muted backdrop-blur-sm leading-snug max-w-xl",
          className,
        )}
      >
        {content}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "glass rounded-lg p-3 border border-line text-sm",
        className,
      )}
    >
      <p className="text-muted">{content}</p>
    </div>
  );
}
