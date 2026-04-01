import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Package from "@/models/Package";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    await dbConnect();
    const packages = await Package.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, packages });
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

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
