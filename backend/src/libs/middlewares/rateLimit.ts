import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { CustomError } from "../utils/CustomError";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis) {
  console.warn(
    "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is disabled (fail-open).",
  );
}

interface RateLimitOptions {
  /** Sliding window size, e.g. "5 m", "1 m", "60 s" — @upstash/ratelimit duration format. */
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
  max: number;
  /** Groups limiters sharing a Redis key namespace, e.g. "auth", "bids". */
  keyPrefix: string;
}

/**
 * Per-route rate limiter backed by Upstash Redis (required for Vercel's
 * serverless functions, which don't share in-memory state between
 * invocations). Fails open (no limiting) if Upstash isn't configured yet,
 * rather than taking the API down over a missing env var — see
 * myallocator.router.ts for the same fail-open precedent.
 */
export function rateLimit({ window, max, keyPrefix }: RateLimitOptions) {
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, window),
        prefix: `ratelimit:${keyPrefix}`,
      })
    : null;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!limiter) return next();

    const userId = (req as { user?: { id?: string } }).user?.id;
    const identifier = userId ? `user:${userId}` : `ip:${req.ip}`;

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());

    if (!success) {
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      throw new CustomError(
        "Too many requests. Please slow down and try again shortly.",
        429,
        { retryAfterSeconds },
        "RATE_LIMITED",
      );
    }

    next();
  };
}
