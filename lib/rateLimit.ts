import { NextResponse } from "next/server";

/**
 * Lightweight in-memory rate limiter (fixed window). Zero dependencies.
 *
 * Note: state is per server instance. On serverless (Vercel) each warm lambda
 * keeps its own counters — still effective against bursts/brute force, and
 * exactly right for a portfolio-scale app. Swap the Map for Redis/Upstash if
 * multi-instance precision is ever needed.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets (only meaningful when !ok). */
  retryAfter: number;
}

/**
 * @param key    unique key: "route:identifier" (IP and/or user id)
 * @param limit  max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Best-effort client IP (works behind Vercel/proxies). */
export function getClientIp(req: Request): string {
  const first = (name: string) =>
    (req.headers.get(name) || "").split(",")[0].trim();
  return first("x-forwarded-for") || first("x-real-ip") || "unknown";
}

/** Standard 429 response with Retry-After. */
export function tooManyRequests(retryAfter: number, message?: string) {
  return NextResponse.json(
    {
      success: false,
      message:
        message ||
        `Too many requests. Please try again in ${retryAfter} seconds.`,
      desc: "Rate limit exceeded",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/**
 * One-liner guard for route handlers:
 *   const limited = guardRate(req, "login", 5, 60_000);
 *   if (limited) return limited;
 */
export function guardRate(
  req: Request,
  route: string,
  limit: number,
  windowMs: number,
  extraKey?: string,
) {
  const key = `${route}:${getClientIp(req)}${extraKey ? ":" + extraKey : ""}`;
  const res = rateLimit(key, limit, windowMs);
  return res.ok ? null : tooManyRequests(res.retryAfter);
}
