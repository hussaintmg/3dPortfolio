import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import { verifyToken } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";
import sitemap from "@/app/sitemap";
import {
  INDEXNOW_KEY_LOCATION,
  submitToIndexNow,
} from "@/lib/indexnow";

/**
 * Manual IndexNow control.
 *
 * Content routes already ping on every publish, but two cases need a button:
 * the very first submission after going live (nothing has changed since, so
 * nothing would ping) and re-submitting everything after a domain change.
 */

async function requireOwner() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const session: any = await verifyToken(token);
  if (!session || session.role !== "owner") return null;
  return session;
}

const denied = () =>
  NextResponse.json(
    { success: false, message: "Only the owner can submit URLs to search engines" },
    { status: 403 },
  );

/**
 * Reports whether the setup is actually working, rather than merely present.
 *
 * Every check fetches the real URL a crawler would fetch. "The file exists in
 * the repo" and "the file answers 200 on the live domain" are different
 * claims, and only the second one gets a site verified.
 */
export async function GET() {
  if (!(await requireOwner())) return denied();

  let settings: any = null;
  try {
    await dbConnect();
    settings = await SiteSettings.findOne({ key: "global" })
      .select("googleVerification googleVerificationFile bingVerification description")
      .lean();
  } catch {
    // Reported as "not configured" rather than failing the whole check
  }

  const google =
    settings?.googleVerification?.trim() ||
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    "";
  const bing =
    settings?.bingVerification?.trim() ||
    process.env.BING_SITE_VERIFICATION?.trim() ||
    "";
  const googleFile =
    settings?.googleVerificationFile?.trim() ||
    process.env.GOOGLE_VERIFICATION_FILE?.trim() ||
    "";

  const probe = async (path: string) => {
    try {
      const res = await fetch(new URL(path, SITE_URL).toString(), {
        cache: "no-store",
      });
      return { path, status: res.status, ok: res.ok };
    } catch (e: any) {
      return { path, status: 0, ok: false, error: e?.message || "unreachable" };
    }
  };

  const [keyFile, robots, sitemapFile, llms, googleFileCheck] = await Promise.all([
    probe(new URL(INDEXNOW_KEY_LOCATION).pathname),
    probe("/robots.txt"),
    probe("/sitemap.xml"),
    probe("/llms.txt"),
    googleFile ? probe(`/${googleFile}`) : Promise.resolve(null),
  ]);

  let urlCount = 0;
  try {
    urlCount = (await sitemap()).length;
  } catch {
    // A sitemap failure already shows up as a non-200 above
  }

  return NextResponse.json({
    success: true,
    siteUrl: SITE_URL,
    keyLocation: INDEXNOW_KEY_LOCATION,
    keyFileOk: keyFile.ok,
    keyFileError: keyFile.ok ? "" : `Key file returned ${keyFile.status}`,
    checks: { robots, sitemap: sitemapFile, llms, keyFile, googleFile: googleFileCheck },
    urlCount,
    googleVerificationConfigured: !!google,
    bingVerificationConfigured: !!bing,
    googleVerificationFile: googleFile,
    /** Below ~90 characters Google writes its own snippet instead. */
    descriptionLength: (settings?.description || "").trim().length,
  });
}

export async function POST(req: Request) {
  if (!(await requireOwner())) return denied();

  try {
    const body = await req.json().catch(() => ({}));

    const urls: string[] = Array.isArray(body?.urls) && body.urls.length
      ? body.urls
      : (await sitemap()).map((entry) => entry.url);

    const result = await submitToIndexNow(urls);

    return NextResponse.json(
      { success: result.ok, ...result },
      { status: result.ok ? 200 : 502 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
