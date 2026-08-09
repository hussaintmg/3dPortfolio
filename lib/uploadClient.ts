"use client";

import {
  BUCKET_MAX_BYTES,
  SERVERLESS_SAFE_BYTES,
  uploadSizeError,
  formatBytes,
} from "@/lib/uploadLimits";

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
 * The bytes go **straight from the browser to Supabase** through a signed
 * URL. That is not an optimisation, it is the fix: routing them through
 * `/api/upload` puts them inside a serverless request body, and Vercel caps
 * that at roughly 4.5MB, so every video larger than a few seconds was
 * rejected by the platform before our code saw it.
 *
 * `/api/upload` is kept as a fallback for the case where signing is
 * unavailable (a missing service key, say), but only for files small enough
 * to survive the trip — offering it for a 30MB video would just fail slowly.
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

  // 1. Ask our server to authorise the write (JSON only — no file bytes).
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
      // A refusal on size or auth is final — do not retry through the
      // fallback, it would fail for the same reason with a worse message.
      if (res.status === 413 || res.status === 401 || res.status === 403) {
        return { success: false, error: ticket?.error || "Upload refused." };
      }
      ticket = null;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Upload cancelled." };
    ticket = null;
  }

  if (ticket?.signedUrl) {
    const put = await putWithProgress(
      ticket.signedUrl,
      file,
      ticket.contentType || file.type || "application/octet-stream",
      onProgress,
      signal,
    );
    if (put.success) {
      onProgress?.(100);
      return {
        success: true,
        publicUrl: ticket.publicUrl,
        filePath: ticket.filePath,
        contentType: ticket.contentType,
      };
    }
    // Storage itself refused (size, bad token). Falling back cannot help.
    if (put.fatal) return { success: false, error: put.error };
  }

  // 2. Legacy path, small files only.
  if (file.size > SERVERLESS_SAFE_BYTES) {
    return {
      success: false,
      error:
        "Direct upload is unavailable right now and this file is too big for the fallback. Please try again in a moment.",
    };
  }
  return legacyUpload(file, folder, onProgress, signal);
}

/** XHR rather than fetch purely because fetch cannot report upload progress. */
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<{ success: boolean; error?: string; fatal?: boolean }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("content-type", contentType);
    // Never silently replace someone else's object; keys are timestamped anyway
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        // Hold at 99 until storage confirms — a full bar that then fails reads
        // as a lie, and the last few percent are the server writing the object.
        onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ success: true });
      if (xhr.status === 413) {
        return resolve({
          success: false,
          fatal: true,
          error: `Storage rejected this file: it is over the ${formatBytes(BUCKET_MAX_BYTES)} limit.`,
        });
      }
      resolve({
        success: false,
        error: `Upload failed (${xhr.status}).`,
      });
    };

    xhr.onerror = () =>
      resolve({
        success: false,
        error: "Connection lost during the upload.",
      });
    xhr.ontimeout = () =>
      resolve({ success: false, error: "The upload timed out." });

    // A 50MB clip on a slow connection genuinely takes minutes
    xhr.timeout = 15 * 60_000;

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return resolve({ success: false, fatal: true, error: "Upload cancelled." });
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
      xhr.onabort = () =>
        resolve({ success: false, fatal: true, error: "Upload cancelled." });
    }

    xhr.send(file);
  });
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
