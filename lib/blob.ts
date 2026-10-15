import { put, del, list, head } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

/**
 * Resolves the Vercel Blob read-write token directly from environment variables.
 */
export async function getBlobToken(): Promise<string> {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
}

export interface BlobUploadResult {
  success: true;
  filePath: string;
  pathname: string;
  fileName: string;
  publicUrl: string;
  fileType: string;
}

export interface BlobUploadError {
  success: false;
  error: string;
}

/**
 * Server-side file upload to Vercel Blob.
 * Used by /api/upload and server actions.
 */
export async function uploadFileToBlob(
  file: File,
  folderPath: string,
): Promise<BlobUploadResult | BlobUploadError> {
  try {
    const token = await getBlobToken();
    if (!token) {
      throw new Error(
        "Vercel Blob token is not configured. Please set BLOB_READ_WRITE_TOKEN in environment variables.",
      );
    }

    const uniqueFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const pathname = `${folderPath}/${uniqueFileName}`;
    const contentType = resolveContentType(file.name, file.type);

    let uploadData: any = file;
    if (typeof window === "undefined") {
      const arrayBuffer = await file.arrayBuffer();
      uploadData = Buffer.from(arrayBuffer);
    }

    const blob = await put(pathname, uploadData, {
      access: "public",
      token,
      contentType,
      addRandomSuffix: false,
    });

    return {
      success: true,
      filePath: blob.url,
      pathname: blob.pathname,
      fileName: uniqueFileName,
      publicUrl: blob.url,
      fileType: contentType,
    };
  } catch (error: any) {
    console.error("Vercel Blob upload error:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred during upload",
    };
  }
}

/**
 * Deletes a file from Vercel Blob storage.
 * Handles both full blob URLs (https://...blob.vercel-storage.com/...)
 * and relative pathnames (chat/...).
 * Also gracefully handles legacy keys by skipping if not found.
 */
export async function deleteBlob(
  keyOrUrl: string,
): Promise<{ success: boolean; error?: string }> {
  if (!keyOrUrl || typeof keyOrUrl !== "string") {
    return { success: true };
  }

  const token = await getBlobToken();
  if (!token) {
    console.warn("Vercel Blob token is missing; skipping delete for:", keyOrUrl);
    return { success: true };
  }

  try {
    const target = keyOrUrl.trim();

    // 1. If it's a full URL
    if (target.startsWith("http://") || target.startsWith("https://")) {
      if (
        target.includes("blob.vercel-storage.com") ||
        target.includes("vercel-storage")
      ) {
        await del(target, { token });
      }
      return { success: true };
    }

    // 2. If it's a pathname, look up blob by prefix
    try {
      const { blobs } = await list({ prefix: target, token });
      const match = blobs.find((b) => b.pathname === target);
      if (match) {
        await del(match.url, { token });
      }
    } catch {
      // Ignore if list fails or blob does not exist in Vercel Blob (e.g. legacy Supabase item)
    }

    return { success: true };
  } catch (error: any) {
    console.error("Vercel Blob delete error:", error);
    return { success: false, error: error.message || "Failed to delete blob" };
  }
}

/** Alias for backward compatibility */
export const deleteFileFromBlob = deleteBlob;

/**
 * Generates a client-side upload token for browser-direct uploads.
 * Takes the serverless function out of the payload path, allowing files
 * up to Vercel Blob's ceiling without 4.5MB request body restrictions.
 */
export async function createClientUploadToken(
  pathname: string,
  maximumSizeInBytes?: number,
): Promise<{ success: true; clientToken: string } | { success: false; error: string }> {
  try {
    const token = await getBlobToken();
    if (!token) {
      return {
        success: false,
        error:
          "Vercel Blob token is not configured. Please set BLOB_READ_WRITE_TOKEN in environment variables.",
      };
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname,
      maximumSizeInBytes,
    });

    return {
      success: true,
      clientToken,
    };
  } catch (error: any) {
    console.error("Vercel Blob client token generation error:", error);
    return {
      success: false,
      error: error.message || "Could not generate client upload token",
    };
  }
}

/**
 * Resolves the MIME type to store a file under.
 */
export function resolveContentType(fileName: string, declaredType?: string): string {
  const declared = (declaredType || "").split(";")[0].trim();
  return declared && declared !== "application/octet-stream"
    ? declared
    : getContentType(fileName);
}

export function getContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    odt: "application/vnd.oasis.opendocument.text",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    rtf: "application/rtf",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    xml: "application/xml",
    // images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    heic: "image/heic",
    heif: "image/heif",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    // audio
    webm: "video/webm",
    weba: "audio/webm",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    opus: "audio/opus",
    flac: "audio/flac",
    // video
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    ogv: "video/ogg",
    // archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    gz: "application/gzip",
    tar: "application/x-tar",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}
