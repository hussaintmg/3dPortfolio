import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";

/**
 * Bing Webmaster Tools site verification, XML-file method.
 *
 * Bing offers three ways to prove ownership: this file, a meta tag, or a DNS
 * record. The meta tag is wired up in `app/layout.tsx` from the same value —
 * both are served so whichever option the verification screen defaults to
 * just works, and neither exists until the code is set.
 *
 * The code is read from the saved settings first so it can be published from
 * the dashboard without a redeploy; the environment variable stays as a
 * fallback. That also means this route can no longer be static.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let code = process.env.BING_SITE_VERIFICATION?.trim() || "";

  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" })
      .select("bingVerification")
      .lean();
    if (s?.bingVerification?.trim()) code = s.bingVerification.trim();
  } catch {
    // Fall back to the environment rather than 500 on a database hiccup
  }

  if (!code) {
    return new Response("Not found", { status: 404 });
  }

  const xml = `<?xml version="1.0"?>\n<users>\n  <user>${code}</user>\n</users>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
