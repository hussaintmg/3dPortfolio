import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteLink from "@/models/SiteLink";
import { verifyToken } from "@/lib/auth";

/**
 * Only same-origin paths, absolute http(s) URLs and mail/tel links are
 * allowed — this blocks `javascript:` and other script-bearing schemes.
 */
function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim().slice(0, 500);
  if (!href) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    // Has a scheme — allow only these
    return /^(https?:|mailto:|tel:)/i.test(href) ? href : null;
  }
  // Schemeless: must be a root-relative path or an in-page anchor
  return /^([/#?]|$)/.test(href) ? href : null;
}

/** GET → { links: { key: { href, newTab, enabled } } } */
export async function GET() {
  try {
    await dbConnect();
    const docs = await SiteLink.find().lean();
    const links: Record<string, any> = {};
    for (const d of docs as any[]) {
      links[d.key] = {
        href: d.href || "",
        newTab: !!d.newTab,
        enabled: d.enabled !== false,
      };
    }
    return NextResponse.json({ success: true, links });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT body: { updates: { key: { href, newTab, enabled } | null } }
 * A null/empty href removes the link. Owner only.
 */
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user || user.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Only the owner can change links" },
        { status: 403 },
      );
    }

    const { updates } = await req.json();
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, message: "No updates provided" },
        { status: 400 },
      );
    }

    const ops: any[] = [];
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(updates as Record<string, any>)) {
      const href = safeHref(value?.href);
      if (!value || !href) {
        // Cleared, or an href we refuse to store
        if (value?.href) rejected.push(key);
        ops.push({ deleteOne: { filter: { key } } });
        continue;
      }
      ops.push({
        updateOne: {
          filter: { key },
          update: {
            $set: {
              href,
              newTab: !!value.newTab,
              enabled: value.enabled !== false,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid updates" },
        { status: 400 },
      );
    }

    await SiteLink.bulkWrite(ops);
    return NextResponse.json({
      success: true,
      message: rejected.length
        ? `${ops.length} link(s) saved — ${rejected.length} rejected as unsafe`
        : `${ops.length} link(s) saved`,
      rejected,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
