import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";

/**
 * Google Search Console verification, HTML-file method.
 *
 * Google asks you to publish a file at `/googleXXXXXXXX.html` whose entire
 * contents are `google-site-verification: googleXXXXXXXX.html`. The filename
 * is different for every property, so it cannot be a static route — the
 * middleware rewrites any `/google*.html` request here and this handler
 * answers only for the filename the owner actually saved.
 *
 * Anything else 404s, which is what Google expects for a wrong file and stops
 * this becoming an "any path you like returns 200" hole.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = (request.nextUrl.searchParams.get("file") || "").trim();

  // Reject anything that is not literally a Google verification filename
  if (!/^google[A-Za-z0-9_-]+\.html$/.test(requested)) {
    return new Response("Not found", { status: 404 });
  }

  let expected = process.env.GOOGLE_VERIFICATION_FILE?.trim() || "";

  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" })
      .select("googleVerificationFile")
      .lean();
    if (s?.googleVerificationFile?.trim()) {
      expected = s.googleVerificationFile.trim();
    }
  } catch {
    // Fall back to the environment rather than 500 on a database hiccup
  }

  if (!expected || expected !== requested) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(`google-site-verification: ${expected}`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
