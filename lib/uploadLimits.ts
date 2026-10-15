/**
 * One place for "how big is too big", shared by the browser and the server.
 *
 * There are two separate ceilings:
 *
 * 1. **Vercel's request body limit (~4.5MB).** Anything posted to
 *    `/api/upload` passes *through* a serverless function, so the platform
 *    rejects the request before our code ever runs. This is why sending a
 *    video from chat failed in production while a screenshot worked — the
 *    video was simply bigger than the pipe.
 * 2. **The Vercel Blob storage limit (50MB).** Set on client uploads and server
 *    direct uploads to keep within store quotas.
 *
 * The fix for (1) is not going through the function at all: the browser
 * uploads straight to Vercel Blob using a short-lived client upload token
 * that the server mints. See `lib/uploadClient.ts`.
 */

export const STORAGE_BUCKET = "vercel-blob";

/** The store's maximum file size. Nothing larger can be stored. */
export const BUCKET_MAX_BYTES = 50 * 1024 * 1024;
export const BLOB_MAX_BYTES = BUCKET_MAX_BYTES;

/**
 * The largest body we are willing to push through a serverless function.
 * Vercel's documented limit is 4.5MB; staying under it leaves room for the
 * multipart envelope.
 */
export const SERVERLESS_SAFE_BYTES = 4 * 1024 * 1024;

/**
 * Per-kind caps for chat attachments.
 *
 * Video gets the full bucket allowance because that is the whole point of the
 * direct-upload path, but a free plan only holds 1GB in total, so it is worth
 * knowing that roughly twenty 45MB clips fill it.
 */
export const SIZE_LIMITS = {
  image: 15 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: BUCKET_MAX_BYTES,
  file: 25 * 1024 * 1024,
} as const;

export type AttachmentKind = keyof typeof SIZE_LIMITS;

/** What the message model calls this file, derived from its MIME type. */
export function kindFromMime(mime?: string | null): AttachmentKind {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "file";
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

/**
 * Returns a sentence explaining why this file cannot be sent, or `null` if it
 * can. Phrased for a person: it names the actual size, because "file too
 * large" without a number tells nobody what to do next.
 */
export function uploadSizeError(
  size: number,
  mime?: string | null,
): string | null {
  const kind = kindFromMime(mime);
  const cap = SIZE_LIMITS[kind];
  if (size <= cap) return null;

  const noun =
    kind === "video"
      ? "video"
      : kind === "image"
        ? "image"
        : kind === "audio"
          ? "audio clip"
          : "file";

  const extra =
    kind === "video"
      ? " Try trimming it, or share a link instead."
      : "";

  return `This ${noun} is ${formatBytes(size)} and the limit is ${formatBytes(cap)}.${extra}`;
}

/** Keeps a storage key safe and predictable without losing the extension. */
export function safeObjectName(name: string): string {
  const cleaned = (name || "file")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);
  return `${Date.now()}_${cleaned || "file"}`;
}
