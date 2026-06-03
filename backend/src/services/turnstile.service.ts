import axios from "axios";
import { CustomError } from "../libs/utils/CustomError";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/** Returns true when verification is skipped (dev without secret). */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification (dev only)",
      );
      return;
    }
    throw new CustomError(
      "Security verification is not configured",
      503,
      null,
      "TURNSTILE_NOT_CONFIGURED",
    );
  }

  if (!token?.trim()) {
    throw new CustomError(
      "Please complete the security check",
      400,
      null,
      "TURNSTILE_REQUIRED",
    );
  }

  const params = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  let data: TurnstileVerifyResponse;
  try {
    const res = await axios.post<TurnstileVerifyResponse>(
      SITEVERIFY_URL,
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10_000,
      },
    );
    data = res.data;
  } catch (err) {
    console.error("[turnstile] siteverify request failed:", err);
    throw new CustomError(
      "Security verification could not be completed. Please try again.",
      503,
      null,
      "TURNSTILE_UNAVAILABLE",
    );
  }

  if (!data.success) {
    console.warn("[turnstile] verification failed:", data["error-codes"]);
    throw new CustomError(
      "Security verification failed. Please try again.",
      400,
      null,
      "TURNSTILE_FAILED",
    );
  }
}
