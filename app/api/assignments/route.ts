import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PackageAssignment from "@/models/PackageAssignment";
import Package from "@/models/Package";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}
const isStaff = (u: any) => u.role === "admin" || u.role === "owner";

/** GET → staff: all (or ?userId=), client: only their own assignments. */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const filter: any = isStaff(user)
      ? searchParams.get("userId")
        ? { userId: searchParams.get("userId") }
        : {}
      : { userId: user.id };

    const assignments = await PackageAssignment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Attach client details for the staff-side list
    let clients: any[] = [];
    if (isStaff(user)) {
      const ids = [...new Set(assignments.map((a: any) => a.userId))].filter(
        (id) => /^[0-9a-f]{24}$/i.test(id),
      );
      clients = await User.find({ _id: { $in: ids } })
        .select("username displayName email")
        .lean();
    }
    const map = new Map(clients.map((c: any) => [String(c._id), c]));

    return NextResponse.json({
      success: true,
      assignments: assignments.map((a: any) => ({
        ...a,
        client: map.get(a.userId) || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST → assign a package to a client (staff only). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user || !isStaff(user))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { userId, packageId, price, currency = "USD", notes = "", projectUrl = "", expiresAt } =
      await req.json();

    if (!userId || !packageId)
      return NextResponse.json(
        { success: false, message: "Client and package are required" },
        { status: 400 },
      );

    // Never offer the same package twice once it has been paid for
    const existingPaid = await PackageAssignment.findOne({
      userId,
      packageId,
      paid: true,
    });
    if (existingPaid)
      return NextResponse.json(
        {
          success: false,
          message: "This client already paid for this package",
        },
        { status: 409 },
      );

    const pkg: any = await Package.findById(packageId).lean();

    const assignment = await PackageAssignment.create({
      userId,
      packageId,
      packageName: pkg?.name || "",
      price: price ?? pkg?.discountedPrice ?? pkg?.price ?? 0,
      currency,
      notes,
      projectUrl,
      status: "offered",
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
