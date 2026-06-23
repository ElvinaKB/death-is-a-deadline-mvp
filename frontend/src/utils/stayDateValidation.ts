import { format, isBefore } from "date-fns";
import {
  getOccupiedNightDates,
  isDateInBlackout,
  isDayOfWeekAllowed,
  toApiDateOnly,
} from "./dateHelpers";

/** 0 = Sunday … 6 = Saturday (matches place.allowedDaysOfWeek). */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type StayNightIssueReason = "blackout" | "day_of_week" | "sold_out";

export interface StayNightIssue {
  date: Date;
  reason: StayNightIssueReason;
}

export function getStayNightIssues(
  checkIn: Date | undefined,
  checkOut: Date | undefined,
  options: {
    blackoutDates?: string[];
    allowedDaysOfWeek?: number[];
    soldOutNights?: Set<string>;
  },
): StayNightIssue[] {
  if (!checkIn || !checkOut || !isBefore(checkIn, checkOut)) {
    return [];
  }

  return getOccupiedNightDates(checkIn, checkOut).flatMap((date) => {
    const nightKey = toApiDateOnly(date);
    if (nightKey && options.soldOutNights?.has(nightKey)) {
      return [{ date, reason: "sold_out" as const }];
    }
    if (isDateInBlackout(date, options.blackoutDates)) {
      return [{ date, reason: "blackout" as const }];
    }
    if (!isDayOfWeekAllowed(date, options.allowedDaysOfWeek)) {
      return [{ date, reason: "day_of_week" as const }];
    }
    return [];
  });
}

/** Mon–Sun display order for allowed-days copy. */
export function formatAllowedDaysOfWeek(allowedDaysOfWeek: number[]): string {
  const order = (d: number) => (d === 0 ? 7 : d);
  const sorted = [...allowedDaysOfWeek].sort((a, b) => order(a) - order(b));
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

function formatNightLabels(dates: Date[]): string {
  return dates.map((d) => format(d, "EEEE, MMM d")).join("; ");
}

/** User-facing error when they cannot proceed (payment, lock-in, CTA). */
export function buildStayDatesProceedError(
  checkIn: Date | undefined,
  checkOut: Date | undefined,
  options: {
    blackoutDates?: string[];
    allowedDaysOfWeek?: number[];
    soldOutNights?: Set<string>;
  },
): string | null {
  if (!checkIn || !checkOut) {
    return "Select check-in and check-out dates.";
  }
  if (!isBefore(checkIn, checkOut)) {
    return "Check-out must be after check-in.";
  }

  const issues = getStayNightIssues(checkIn, checkOut, options);
  if (issues.length === 0) {
    return null;
  }

  const parts: string[] = [];
  const weekdayIssues = issues.filter((i) => i.reason === "day_of_week");
  const blackoutIssues = issues.filter((i) => i.reason === "blackout");
  const soldOutIssues = issues.filter((i) => i.reason === "sold_out");

  if (soldOutIssues.length > 0) {
    const labels = soldOutIssues
      .map((i) => format(i.date, "EEEE, MMM d"))
      .join("; ");
    parts.push(
      soldOutIssues.length === 1
        ? `Your stay includes a fully booked night (${labels}). Choose different dates.`
        : `Your stay includes fully booked nights (${labels}). Choose different dates.`,
    );
  }

  if (weekdayIssues.length > 0) {
    const allowed = options.allowedDaysOfWeek?.length
      ? formatAllowedDaysOfWeek(options.allowedDaysOfWeek)
      : "the days this hotel accepts";
    const nights = formatNightLabels(weekdayIssues.map((i) => i.date));
    parts.push(
      weekdayIssues.length === 1
        ? `Your stay includes ${nights}, which is not available. This hotel only accepts overnight stays on: ${allowed}. Change your dates so each night you stay falls on an allowed day.`
        : `Your stay includes nights that are not available (${nights}). This hotel only accepts overnight stays on: ${allowed}. Change your dates so each night you stay falls on an allowed day.`,
    );
  }

  if (blackoutIssues.length > 0) {
    const labels = blackoutIssues
      .map((i) => format(i.date, "EEEE, MMM d"))
      .join("; ");
    parts.push(
      blackoutIssues.length === 1
        ? `Your stay includes a blocked night (${labels}). Choose different dates that avoid that night.`
        : `Your stay includes blocked nights (${labels}). Choose different dates that avoid those nights.`,
    );
  }

  return parts.join(" ");
}

export interface StayDatesAlertContent {
  title: string;
  lines: string[];
}

/** Copy for the inline warning banner on the dates step. */
export function buildStayDatesAlertContent(
  issues: StayNightIssue[],
  allowedDaysOfWeek?: number[],
): StayDatesAlertContent {
  const weekdayIssues = issues.filter((i) => i.reason === "day_of_week");
  const blackoutIssues = issues.filter((i) => i.reason === "blackout");
  const soldOutIssues = issues.filter((i) => i.reason === "sold_out");

  if (soldOutIssues.length > 0) {
    return {
      title: "Some nights in your stay are fully booked",
      lines: [
        `Fully booked: ${soldOutIssues.map((i) => format(i.date, "EEEE, MMM d")).join("; ")}.`,
        "Choose different check-in or check-out dates.",
      ],
    };
  }

  if (weekdayIssues.length > 0 && blackoutIssues.length > 0) {
    const allowed = allowedDaysOfWeek?.length
      ? formatAllowedDaysOfWeek(allowedDaysOfWeek)
      : "the days this hotel accepts";
    return {
      title: "Some nights in your stay are not available",
      lines: [
        `Not available for overnight stays: ${formatNightLabels(weekdayIssues.map((i) => i.date))}. Allowed nights: ${allowed}.`,
        `Blocked dates: ${blackoutIssues.map((i) => format(i.date, "EEEE, MMM d")).join("; ")}.`,
        "Adjust check-in or check-out so every night you stay is allowed.",
      ],
    };
  }

  if (weekdayIssues.length > 0) {
    const allowed = allowedDaysOfWeek?.length
      ? formatAllowedDaysOfWeek(allowedDaysOfWeek)
      : "the days this hotel accepts";
    return {
      title: "Some nights in your stay are not available",
      lines: [
        `You are staying on ${formatNightLabels(weekdayIssues.map((i) => i.date))}, but this hotel does not accept overnight stays on ${weekdayIssues.length === 1 ? "that day" : "those days"}.`,
        `Allowed nights: ${allowed}.`,
        "Shorten or shift your dates so each night falls on an allowed day (checkout can be on any day).",
      ],
    };
  }

  return {
    title: "Some nights in your stay are blocked",
    lines: [
      `Blocked: ${blackoutIssues.map((i) => format(i.date, "EEEE, MMM d")).join("; ")}.`,
      "Choose different check-in or check-out dates that avoid those nights.",
    ],
  };
}
