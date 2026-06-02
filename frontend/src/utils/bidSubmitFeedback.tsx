import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ApiError } from "../types/api.types";

/** Mirrors backend `ErrorCode` for bid create failures we handle in UI. */
export const BidSubmitErrorCode = {
  BID_TOO_LOW: "BID_TOO_LOW",
  BID_OVERLAP_PENDING: "BID_OVERLAP_PENDING",
  BID_BLACKOUT_DATE: "BID_BLACKOUT_DATE",
  PLACE_NOT_AVAILABLE: "PLACE_NOT_AVAILABLE",
} as const;

export type BidAlertVariant = "rejected" | "overlap" | "warning";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string" &&
    (error as ApiError).message.trim()
  ) {
    return (error as ApiError).message.trim();
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as ApiError).code === "string"
  ) {
    return (error as ApiError).code;
  }
  return undefined;
}

export function isBidErrorCode(error: unknown, code: string): boolean {
  return getApiErrorCode(error) === code;
}

/** Active bid on overlapping dates (400 + BID_OVERLAP_PENDING). */
export function isBidOverlapRejection(error: unknown): boolean {
  return isBidErrorCode(error, BidSubmitErrorCode.BID_OVERLAP_PENDING);
}

/** Toast for bid submit outcomes — API `message` is always the primary line. */
export function showBidAlertToast(
  apiMessage: string,
  options?: { hint?: string; variant?: BidAlertVariant },
) {
  const variant = options?.variant ?? "rejected";
  const Icon = variant === "overlap" ? AlertCircle : XCircle;
  const iconBorder =
    variant === "overlap" ? "border-warning" : "border-danger";
  const iconColor = variant === "overlap" ? "text-warning" : "text-danger";

  toast.custom(
    () => (
      <div className="bg-bg border border-line rounded-xl p-4 shadow-lg min-w-[320px]">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-12 h-12 shrink-0 rounded-full border-2 ${iconBorder} flex items-center justify-center`}
          >
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-fg text-base leading-snug">{apiMessage}</p>
            {variant === "rejected" && (
              <p className="text-danger text-sm mt-1">No charge.</p>
            )}
          </div>
        </div>
        {options?.hint ? (
          <div className="border-t border-line pt-3">
            <div className="flex items-center gap-2 text-muted">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <p className="text-sm">{options.hint}</p>
            </div>
          </div>
        ) : null}
      </div>
    ),
    { duration: 6000 },
  );
}
