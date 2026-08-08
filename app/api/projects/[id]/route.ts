import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Project from "@/models/Project";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { deleteFileFromSupabase } from "@/lib/supabase";

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

    // Purge old visual if replacing with a new one
    const oldProject = await Project.findById(id);
    if (
      oldProject?.media?.storageKey &&
      body.media?.storageKey &&
      oldProject.media.storageKey !== body.media.storageKey
    ) {
      await deleteFileFromSupabase(oldProject.media.storageKey);
    }

    const updated = await Project.findByIdAndUpdate(id, body, { returnDocument: "after" });
    return NextResponse.json({ success: true, project: updated });
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

    const p = await Project.findById(id);
    if (p?.media?.storageKey) {
      await deleteFileFromSupabase(p.media.storageKey);
    }

    await Project.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Project deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
