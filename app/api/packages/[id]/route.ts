import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Package from "@/models/Package";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
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

    const updated = await Package.findByIdAndUpdate(id, {
      ...body,
      price,
      discountedPrice,
      discountPercent,
    }, { new: true });

    return NextResponse.json({ success: true, package: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    await Package.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Package deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
