// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
// Secret key must stay server-only (no NEXT_PUBLIC_ prefix). The old public name
// is kept as a fallback so existing deployments keep working until env is updated.
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || "";

// On server-side, use the secret key to bypass RLS (e.g. for deleting files).
// On client-side, use the publishable key.
const isServer = typeof window === "undefined";
const supabaseKey = isServer && supabaseSecretKey ? supabaseSecretKey : supabasePublishableKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

export const supabaseStorage = supabase.storage;

export async function uploadFileToSupabase(file:File,folderpath:string){
  try {
    // Generate unique file name
    const uniqueFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const filePath = `${folderpath}/${uniqueFileName}`;

    /**
     * The browser already knows what it handed us — a recorded voice note is
     * `audio/webm`, a screenshot `image/png`. Guessing from the extension
     * threw all of that away, and anything not in the table below was stored
     * as `application/octet-stream`, which is why voice notes never played
     * and some images and videos refused to render.
     */
    const declared = (file.type || "").split(";")[0].trim();
    const fileType =
      declared && declared !== "application/octet-stream"
        ? declared
        : getContentType(file.name);

    // Convert file to Buffer on the server side to ensure compatibility
    let uploadData: any = file;
    if (typeof window === "undefined") {
      const arrayBuffer = await file.arrayBuffer();
      uploadData = Buffer.from(arrayBuffer);
    }

    // Upload file
    const { data, error } = await supabaseStorage
      .from("SavedFiles")
      .upload(filePath, uploadData, {
        contentType: fileType,
        upsert: false,
        cacheControl: "3600",
      });
    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("SavedFiles")
      .getPublicUrl(filePath);

    return {
      success: true as const,
      filePath: data!.path,
      fileName: uniqueFileName,
      publicUrl: publicUrlData.publicUrl,
      fileType,
    };
  } catch (error: any) {
    console.error("Supabase upload error:", error);
    return {
      success: false as const,
      error: error.message || "An unknown error occurred",
    };
  }
}

export async function deleteFileFromSupabase(filePath: string) {
  try {
    const { error } = await supabaseStorage
      .from("SavedFiles")
      .remove([filePath]);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Supabase delete error:", error);
    return { success: false, error: error.message || "An unknown error occurred" };
  }
}

export function getDownloadUrl(filePath: string) {
  const { data } = supabaseStorage.from("SavedFiles").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Mints a one-shot upload URL the browser can PUT straight to.
 *
 * Posting a file to our own `/api/upload` means the bytes travel through a
 * serverless function, and Vercel caps that request body at about 4.5MB — so
 * any real video died before a single line of our code ran. A signed upload
 * URL takes the function out of the path entirely: the server only authorises
 * the write, the bytes go browser → Supabase. Storage still enforces the
 * bucket's own 50MB ceiling, which is what we want it to enforce.
 *
 * The URL is valid for two hours and for that one object path only.
 */
export async function createSignedUpload(folderPath: string, fileName: string) {
  const filePath = `${folderPath}/${fileName}`;

  const { data, error } = await supabaseStorage
    .from("SavedFiles")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return {
      success: false as const,
      error: error?.message || "Could not prepare the upload",
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from("SavedFiles")
    .getPublicUrl(filePath);

  return {
    success: true as const,
    filePath,
    fileName,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
  };
}

/**
 * The MIME type to store a file under.
 *
 * Exported because the signed-upload path has no `File` object on the server —
 * only the name and the type the browser reported — and storing the wrong one
 * is precisely what left every earlier voice note as `application/octet-stream`
 * and therefore unplayable.
 */
export function resolveContentType(fileName: string, declaredType?: string) {
  const declared = (declaredType || "").split(";")[0].trim();
  return declared && declared !== "application/octet-stream"
    ? declared
    : getContentType(fileName);
}

export function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  return supabaseStorage.from("SavedFiles").createSignedUrl(filePath, expiresIn);
}

export async function downloadFile(filePath: string) {
  const { data, error } = await supabaseStorage
    .from("SavedFiles")
    .download(filePath);
  if (error) {
    console.error("Supabase download error:", error);
    return null;
  }
  return data;
}

function getContentType(fileName: string): string {
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
    // SVG is served, never rendered inline by us — see the note below
    svg: "image/svg+xml",
    // audio — webm was missing entirely, which is exactly what recordings use
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
    // archives + code
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    gz: "application/gzip",
    tar: "application/x-tar",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}
