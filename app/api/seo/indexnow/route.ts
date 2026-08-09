import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

/** Reports whether the setup is actually working, rather than merely present. */
export async function GET() {
  if (!(await requireOwner())) return denied();

  // Fetching our own key file is the same check IndexNow performs, so a pass
  // here means a submission will not come back 403.
  let keyFileOk = false;
  let keyFileError = "";
  try {
    const res = await fetch(INDEXNOW_KEY_LOCATION, { cache: "no-store" });
    keyFileOk = res.ok;
    if (!res.ok) keyFileError = `Key file returned ${res.status}`;
  } catch (e: any) {
    keyFileError = e?.message || "Key file unreachable";
  }

  return NextResponse.json({
    success: true,
    siteUrl: SITE_URL,
    keyLocation: INDEXNOW_KEY_LOCATION,
    keyFileOk,
    keyFileError,
    bingVerificationConfigured: !!process.env.BING_SITE_VERIFICATION?.trim(),
    googleVerificationConfigured: !!process.env.GOOGLE_SITE_VERIFICATION?.trim(),
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
