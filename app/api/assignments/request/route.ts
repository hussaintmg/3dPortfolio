import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PackageAssignment from "@/models/PackageAssignment";
import Package from "@/models/Package";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { raiseNotification } from "@/lib/notifications";
import { canRequest, isConsumed } from "@/lib/packageFlow";

async function session() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

/**
 * POST — the client asks for a package.
 *
 * Two entry points, one route: a bespoke package the owner already offered
 * them, or one from the public catalogue. Either way this only records the
 * request — no invoice, no payment. The owner decides next.
 */
export async function POST(req: Request) {
  try {
    const me = await session();
    if (!me) {
      return NextResponse.json(
        { success: false, message: "Please sign in first" },
        { status: 401 },
      );
    }

    const { packageId, assignmentId, note = "" } = await req.json();
    await dbConnect();

    // ── Case 1: a package that was already offered to this client ──────────
    if (assignmentId) {
      const existing = await PackageAssignment.findById(assignmentId);
      if (!existing || existing.userId !== me.id) {
        return NextResponse.json(
          { success: false, message: "Not found" },
          { status: 404 },
        );
      }
      if (isConsumed(existing)) {
        return NextResponse.json(
          {
            success: false,
            message: "You've already paid for this package.",
          },
          { status: 409 },
        );
      }
      if (!canRequest(existing)) {
        return NextResponse.json(
          {
            success: false,
            message: "That request is already with me — I'll come back to you.",
          },
          { status: 409 },
        );
      }

      existing.status = "requested";
      existing.requestedAt = new Date();
      existing.requestNote = String(note).slice(0, 500);
      existing.declineReason = "";
      await existing.save();

      await notifyOwner(me, existing.packageName, existing._id);
      return NextResponse.json({ success: true, assignment: existing });
    }

    // ── Case 2: a catalogue package ────────────────────────────────────────
    if (!packageId) {
      return NextResponse.json(
        { success: false, message: "Which package?" },
        { status: 400 },
      );
    }

    const pkg: any = await Package.findById(packageId).lean();
    if (!pkg) {
      return NextResponse.json(
        { success: false, message: "That package no longer exists" },
        { status: 404 },
      );
    }
    /**
     * A bespoke package belongs to exactly one person. Requesting one by id
     * would otherwise let anyone who guessed the id buy someone else's deal.
     */
    if (pkg.isCustom) {
      return NextResponse.json(
        { success: false, message: "That package isn't available to you" },
        { status: 403 },
      );
    }

    // Don't stack duplicate requests for the same thing
    const inFlight = await PackageAssignment.findOne({
      userId: me.id,
      packageId: String(pkg._id),
      status: { $in: ["requested", "approved", "active"] },
    });
    if (inFlight) {
      return NextResponse.json(
        {
          success: false,
          message: "You've already got a request open for this package.",
        },
        { status: 409 },
      );
    }

    const price =
      pkg.discountPercent > 0 && pkg.discountedPrice < pkg.price
        ? pkg.discountedPrice
        : pkg.price;

    const assignment = await PackageAssignment.create({
      userId: me.id,
      packageId: String(pkg._id),
      packageName: pkg.name,
      price,
      currency: "USD",
      status: "requested",
      source: "catalog",
      requestedAt: new Date(),
      requestNote: String(note).slice(0, 500),
    });

    await notifyOwner(me, pkg.name, assignment._id);
    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

async function notifyOwner(me: any, packageName: string, id: unknown) {
  try {
    const user: any = await User.findById(me.id).select("username email").lean();
    await raiseNotification({
      type: "assignment",
      title: `${user?.username || "A client"} requested a package`,
      body: `${packageName} — approve it to open payment`,
      entityId: String(id),
      requireInteraction: true,
    });
  } catch {
    // the request is recorded either way; the owner will see it on the screen
  }
}
