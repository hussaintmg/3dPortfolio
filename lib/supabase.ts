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

    const fileType = getContentType(file.name);

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
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    mp4: "video/mp4",
    txt: "text/plain",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}
