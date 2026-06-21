import { format } from "date-fns";
import { PriorStaySummary } from "../../../types/bid.types";
import { cn } from "../ui/utils";

function formatStayRange(stay: PriorStaySummary): string {
  const checkIn = new Date(stay.checkInDate);
  const checkOut = new Date(stay.checkOutDate);
  return `${format(checkIn, "MMM d")}–${format(checkOut, "MMM d, yyyy")}`;
}

interface PriorStayBannerProps {
  /** Single stay (completed or one upcoming) */
  priorStay?: PriorStaySummary;
  /** Multiple upcoming stays — when length > 1, lists each */
  upcomingStays?: PriorStaySummary[];
  className?: string;
  /** Compact pill for listing hero */
  variant?: "card" | "pill";
  /** Upcoming confirmed booking vs past completed stay */
  kind?: "completed" | "upcoming";
}

export function PriorStayBanner({
  priorStay,
  upcomingStays,
  className,
  variant = "card",
  kind = "completed",
}: PriorStayBannerProps) {
  const stays =
    kind === "upcoming"
      ? (upcomingStays?.length
          ? upcomingStays
          : priorStay
            ? [priorStay]
            : [])
      : priorStay
        ? [priorStay]
        : [];

  if (stays.length === 0) return null;

  const content =
    kind === "upcoming" ? (
      stays.length === 1 ? (
        <>
          You booked this hotel{" "}
          <span className="text-fg font-medium">{formatStayRange(stays[0]!)}</span>{" "}
          for{" "}
          <span className="text-fg font-medium">${stays[0]!.bidPerNight}/night</span>
          . Try booking new dates?
        </>
      ) : (
        <>
          <span className="text-fg font-medium">
            You have {stays.length} upcoming bookings
          </span>{" "}
          at this hotel:
          <ul className="mt-1.5 space-y-0.5 list-none pl-0">
            {stays.map((stay, i) => (
              <li key={`${stay.checkInDate}-${i}`}>
                <span className="text-fg font-medium">{formatStayRange(stay)}</span>
                {" · "}
                <span className="text-fg font-medium">${stay.bidPerNight}/night</span>
              </li>
            ))}
          </ul>
          <span className="block mt-1.5">Try booking new dates?</span>
        </>
      )
    ) : (
      <>
        You stayed here{" "}
        <span className="text-fg font-medium">{formatStayRange(stays[0]!)}</span>{" "}
        for{" "}
        <span className="text-fg font-medium">${stays[0]!.bidPerNight}/night</span>
        . Bid again for a new stay.
      </>
    );

  if (variant === "pill") {
    const pillContent =
      kind === "upcoming" && stays.length > 1 ? (
        <>
          You have{" "}
          <span className="text-fg font-medium">{stays.length} upcoming bookings</span>{" "}
          ({stays.map((s) => format(new Date(s.checkInDate), "MMM d")).join(", ")})
          . Try new dates?
        </>
      ) : (
        content
      );

    return (
      <p
        className={cn(
          "rounded-full border border-line/80 bg-black/50 px-4 py-2 text-xs sm:text-sm text-muted backdrop-blur-sm leading-snug max-w-xl",
          stays.length > 1 && kind === "upcoming" && "rounded-xl",
          className,
        )}
      >
        {pillContent}
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
      <div className="text-muted">{content}</div>
    </div>
  );
}
