"use client";

import {
  BUCKET_MAX_BYTES,
  SERVERLESS_SAFE_BYTES,
  uploadSizeError,
  formatBytes,
} from "@/lib/uploadLimits";
import { put as clientPut } from "@vercel/blob/client";

export interface UploadOutcome {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  contentType?: string;
  error?: string;
}

export interface UploadOptions {
  folder?: string;
  /** 0–100, fired as the bytes actually leave the browser. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a file and reports real progress.
 *
 * The bytes go **straight from the browser to Vercel Blob** using a short-lived
 * client token. That is not an optimisation, it is the fix: routing them through
 * `/api/upload` puts them inside a serverless request body, and Vercel caps
 * that at roughly 4.5MB, so every video larger than a few seconds was
 * rejected by the platform before our code saw it.
 *
 * `/api/upload` is kept as a fallback for the case where client token generation
 * is unavailable, but only for files small enough to survive the trip.
 */
export async function uploadFile(
  file: File,
  { folder = "chat", onProgress, signal }: UploadOptions = {},
): Promise<UploadOutcome> {
  const sizeProblem = uploadSizeError(file.size, file.type);
  if (sizeProblem) return { success: false, error: sizeProblem };
  if (file.size > BUCKET_MAX_BYTES) {
    return {
      success: false,
      error: `Storage accepts files up to ${formatBytes(BUCKET_MAX_BYTES)}; this one is ${formatBytes(file.size)}.`,
    };
  }
  if (file.size === 0) {
    return { success: false, error: "That file is empty." };
  }

  onProgress?.(0);

  // 1. Ask our server to authorise the write and generate a client upload token.
  let ticket: any = null;
  try {
    const res = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        folder,
      }),
      signal,
    });
    ticket = await res.json().catch(() => null);
    if (!res.ok || !ticket?.success) {
      if (res.status === 413 || res.status === 401 || res.status === 403) {
        return { success: false, error: ticket?.error || "Upload refused." };
      }
      ticket = null;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Upload cancelled." };
    ticket = null;
  }

  // 2. Direct upload to Vercel Blob with progress
  if (ticket?.clientToken && ticket?.pathname) {
    try {
      const blob = await clientPut(ticket.pathname, file, {
        access: "public",
        token: ticket.clientToken,
        contentType: ticket.contentType || file.type || "application/octet-stream",
        abortSignal: signal,
        onUploadProgress: ({ percentage }) => {
          onProgress?.(Math.min(99, Math.round(percentage)));
        },
      });

      onProgress?.(100);
      return {
        success: true,
        publicUrl: blob.url,
        filePath: blob.url,
        contentType: blob.contentType || ticket.contentType,
      };
    } catch (err: any) {
      if (err?.name === "BlobRequestAbortedError" || err?.name === "AbortError") {
        return { success: false, error: "Upload cancelled." };
      }
      console.warn("Direct Vercel Blob upload failed, attempting fallback:", err);
      // If error is size or quota refusal, do not fallback
      if (err?.name === "BlobFileTooLargeError" || err?.name === "BlobAccessError") {
        return { success: false, error: err.message || "Upload refused by storage." };
      }
    }
  }

  // 3. Fallback path, small files only.
  if (file.size > SERVERLESS_SAFE_BYTES) {
    return {
      success: false,
      error:
        "Direct upload is unavailable right now and this file is too big for the fallback. Please try again in a moment.",
    };
  }
  return legacyUpload(file, folder, onProgress, signal);
}


/** The original multipart route, still used for small files as a safety net. */
async function legacyUpload(
  file: File,
  folder: string,
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<UploadOutcome> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd, signal });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `Upload failed (${res.status}).` };
    }
    onProgress?.(100);
    return {
      success: true,
      publicUrl: data.publicUrl,
      filePath: data.filePath,
      contentType: data.fileType,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Upload cancelled." };
    return { success: false, error: err?.message || "Upload failed." };
  }
}
