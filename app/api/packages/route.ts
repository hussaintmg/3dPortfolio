import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Package from "@/models/Package";
import PackageAssignment from "@/models/PackageAssignment";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { pingIndexNow } from "@/lib/indexnow";

/**
 * GET — the catalogue.
 *
 * Bespoke packages are filtered out HERE rather than in the page. They were
 * being sent to every visitor and hidden client-side, which meant one
 * client's private price was a single fetch away for anyone.
 */
export async function GET() {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const user: any = token ? await verifyToken(token) : null;
    const isStaff = user?.role === "owner" || user?.role === "admin";

    if (isStaff) {
      const packages = await Package.find().sort({ order: 1, createdAt: -1 });
      return NextResponse.json({ success: true, packages });
    }

    const publicPackages = await Package.find({ isCustom: { $ne: true } })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // A signed-in client also gets the bespoke ones assigned to them
    let mine: any[] = [];
    if (user?.id) {
      const assignments = await PackageAssignment.find({ userId: user.id })
        .select("packageId")
        .lean();
      const ids = assignments.map((a: any) => a.packageId).filter(Boolean);
      if (ids.length) {
        mine = await Package.find({ _id: { $in: ids }, isCustom: true }).lean();
      }
    }

    return NextResponse.json({
      success: true,
      packages: [...publicPackages, ...mine],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const user: any = await verifyToken(token);
    
    // Only Admin/Owner can create packages
    if (user.role !== "admin" && user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    // Discount Calculation Logic
    let { price, discountPercent, discountedPrice } = body;
    if (discountPercent > 0) {
      discountedPrice = price - (price * discountPercent / 100);
    } else if (discountedPrice < price) {
      discountPercent = Math.round(((price - discountedPrice) / price) * 100);
    }

    const pkg = await Package.create({
      ...body,
      discountedPrice,
      discountPercent,
    });

    // Bespoke packages belong to one client and are kept out of the sitemap —
    // handing them to a search engine would undo exactly that
    if (!pkg.isCustom) {
      pingIndexNow([`/packages/${pkg._id}`, "/packages"]);
    }

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
