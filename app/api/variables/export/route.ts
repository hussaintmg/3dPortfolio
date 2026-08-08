import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Variable from "@/models/Variable";
import { verifyToken } from "@/lib/auth";

/** GET — downloads every variable as a JSON file (re-importable as-is). */
export async function GET() {
  try {
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner"))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const vars = await Variable.find().sort({ group: 1, key: 1 }).lean();

    const payload = {
      exportedAt: new Date().toISOString(),
      variables: (vars as any[]).map((v) => ({
        key: v.key,
        label: v.label,
        group: v.group,
        path: v.path,
        sample: v.sample,
        fallback: v.fallback,
        description: v.description,
      })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="variables.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
