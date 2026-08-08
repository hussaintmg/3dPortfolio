import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Package from "@/models/Package";
import PackageAssignment from "@/models/PackageAssignment";
import User from "@/models/User";
import ChatMessage from "@/models/ChatMessage";
import { verifyToken } from "@/lib/auth";
import { raiseNotification } from "@/lib/notifications";
import { invalidateBusinessContext } from "@/lib/ai/prompts";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const session: any = await verifyToken(token);
  return session?.role === "owner" || session?.role === "admin" ? session : null;
}

/**
 * POST — build a one-off package for a single client and hand it to them.
 *
 * This is deliberately one call rather than "create a package, then assign
 * it": a bespoke package has no life outside the client it was made for, so
 * creating it without the assignment would leave an orphan in the catalogue.
 * It is flagged `isCustom`, which is what keeps it off the public page.
 */
export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const {
      userId,
      name,
      description = "",
      price,
      discountedPrice,
      duration = "One-off",
      features = [],
      currency = "USD",
      notes = "",
      projectUrl = "",
      expiresAt,
      sendChatMessage = true,
    } = await req.json();

    if (!userId || !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "A client and a package name are required" },
        { status: 400 },
      );
    }

    const amount = Number(price);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid price" },
        { status: 400 },
      );
    }
    const finalPrice = Number.isFinite(Number(discountedPrice))
      ? Number(discountedPrice)
      : amount;

    await dbConnect();

    const client: any = await User.findById(userId)
      .select("username email")
      .lean();
    if (!client) {
      return NextResponse.json(
        { success: false, message: "That client no longer exists" },
        { status: 404 },
      );
    }

    const pkg = await Package.create({
      name: name.trim().slice(0, 120),
      description: description.trim(),
      price: amount,
      discountedPrice: finalPrice,
      discountPercent:
        amount > 0 && finalPrice < amount
          ? Math.round(((amount - finalPrice) / amount) * 100)
          : 0,
      duration,
      features: (Array.isArray(features) ? features : [])
        .map((f: unknown) => String(f).trim())
        .filter(Boolean)
        .slice(0, 30),
      isCustom: true,
      badge: "Made for you",
      featured: false,
    });

    const assignment = await PackageAssignment.create({
      userId,
      packageId: String(pkg._id),
      packageName: pkg.name,
      price: finalPrice,
      currency,
      status: "offered",
      notes,
      projectUrl,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    });

    // Drop a line in their thread so it doesn't sit unnoticed in the portal
    if (sendChatMessage) {
      try {
        await ChatMessage.create({
          conversationId: userId,
          senderId: staff.id,
          senderName: staff.username || "Hussain",
          senderRole: staff.role,
          type: "text",
          text: `I've put together a package for you — "${pkg.name}" at ${currency} ${finalPrice}. You'll find the details in your portal under Packages.`,
          readBy: [staff.id],
        });
      } catch {
        // the assignment is what matters; a missing chat line is cosmetic
      }
    }

    try {
      await raiseNotification({
        type: "assignment",
        title: "A package was prepared for you",
        body: `${pkg.name} · ${currency} ${finalPrice}`,
        userIds: [userId],
        entityId: String(assignment._id),
      });
    } catch {}

    // Pricing changed, so the assistant's cached facts are stale
    invalidateBusinessContext();

    return NextResponse.json({
      success: true,
      package: pkg,
      assignment,
      client: { username: client.username, email: client.email },
      message: `Sent to ${client.username || client.email}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
