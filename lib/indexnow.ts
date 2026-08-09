import { SITE_URL } from "@/lib/seo";

/**
 * IndexNow — the fast lane into Bing's index.
 *
 * A sitemap only says "here are my pages, come back whenever". IndexNow is a
 * push: Bing (and Yandex, Naver, Seznam, which share the same endpoint) is
 * told the moment a page appears or changes, and typically fetches it within
 * hours instead of weeks. That matters more than it looks — ChatGPT's search
 * reads Bing's index, so a page Bing has not crawled cannot be cited by it.
 *
 * Verification is by key file: whoever can publish a file at
 * `INDEXNOW_KEY_LOCATION` containing the key is allowed to submit URLs for
 * that host. No account, no dashboard, nothing to sign up for.
 */

/**
 * The key is a public random string, not a secret — it lives in a file anyone
 * can fetch. It is checked in so submissions keep working on a fresh deploy
 * with no environment variable set. `INDEXNOW_KEY` overrides it for anyone
 * who would rather use the key Bing Webmaster Tools generates.
 */
const DEFAULT_KEY = "f2723f4de0236dfc4d4b79d1a7c4d31c";

export const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim();

/**
 * Served at the root of the host on purpose: the key file's directory defines
 * which URLs may be submitted, so anything below root would silently limit
 * submissions to a sub-path.
 */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}${INDEXNOW_KEY_PATH}`;

/** One endpoint, shared by every participating engine. */
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The protocol's own cap on a single submission. */
const MAX_URLS = 10_000;

export interface IndexNowResult {
  ok: boolean;
  /** HTTP status from the endpoint, or 0 when nothing was sent. */
  status: number;
  submitted: number;
  message: string;
}

/** What each documented status actually means, in words worth showing an owner. */
function explain(status: number): string {
  switch (status) {
    case 200:
      return "Accepted — Bing has the URLs.";
    case 202:
      return "Accepted, key still being validated. This is normal on the first submission.";
    case 400:
      return "Bad request — the URL list was rejected as malformed.";
    case 403:
      return "Key rejected. The key file is missing or does not match.";
    case 422:
      return "URLs rejected — they do not all belong to this host.";
    case 429:
      return "Rate limited. Too many submissions in a short window.";
    default:
      return `Unexpected response (${status}).`;
  }
}

/** Accepts "/projects" or a full URL and always returns a full URL on this host. */
function absolute(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Submits URLs and reports what happened.
 *
 * Localhost and preview hosts are skipped rather than sent: the endpoint
 * cannot fetch the key file from them, so every dev-time save would otherwise
 * burn a rate-limit slot to earn a 403.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const host = new URL(SITE_URL).host;

  if (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host)) {
    return { ok: false, status: 0, submitted: 0, message: `Skipped — ${host} is not reachable from the internet.` };
  }

  const urlList = Array.from(
    new Set(urls.map(absolute).filter((u) => u.startsWith(SITE_URL))),
  ).slice(0, MAX_URLS);

  if (!urlList.length) {
    return { ok: false, status: 0, submitted: 0, message: "Nothing to submit." };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
      cache: "no-store",
    });

    const ok = res.status === 200 || res.status === 202;
    return {
      ok,
      status: res.status,
      submitted: ok ? urlList.length : 0,
      message: explain(res.status),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      message: `Could not reach IndexNow: ${error?.message || "network error"}`,
    };
  }
}

/**
 * Fire-and-forget version for use inside content routes.
 *
 * Publishing a project must not get slower — or fail — because a search
 * engine's endpoint is having a bad day, so nothing here is awaited and
 * nothing here throws.
 */
export function pingIndexNow(urls: string[]): void {
  void submitToIndexNow(urls)
    .then((r) => {
      if (!r.ok && r.status !== 0) {
        console.warn("[indexnow]", r.status, r.message);
      }
    })
    .catch(() => {
      /* already non-throwing; this is belt and braces */
    });
}
