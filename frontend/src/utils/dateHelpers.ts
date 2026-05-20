import { format, parseISO, isValid } from "date-fns";

/** Normalize any stored/API date to yyyy-MM-dd (backend inventory & blackout format). */
export function toApiDateOnly(
  value: string | Date | null | undefined,
): string | undefined {
  if (value == null || value === "") return undefined;

  if (value instanceof Date) {
    if (!isValid(value)) return undefined;
    return format(value, "yyyy-MM-dd");
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return undefined;
  return format(parsed, "yyyy-MM-dd");
}

/** Parse yyyy-MM-dd or ISO string to local Date for calendars. */
export function parseApiDate(value: string | null | undefined): Date | undefined {
  const dateOnly = toApiDateOnly(value);
  if (!dateOnly) return undefined;
  const parsed = parseISO(dateOnly);
  return isValid(parsed) ? parsed : undefined;
}
