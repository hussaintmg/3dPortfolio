import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import { verifyToken } from "@/lib/auth";
import Project from "@/models/Project";
import ReadymadeSolution from "@/models/ReadymadeSolution";
import Service from "@/models/Service";
import Enquiry from "@/models/Enquiry";
import User from "@/models/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();

    // Last 6 months window for the enquiries chart
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [
      projects,
      solutions,
      services,
      enquiries,
      users,
      monthlyRaw,
      recentEnquiries,
      recentProjects,
      recentSolutions,
    ] = await Promise.all([
      Project.countDocuments(),
      ReadymadeSolution.countDocuments(),
      Service.countDocuments(),
      Enquiry.countDocuments(),
      User.countDocuments(),
      Enquiry.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Enquiry.find().sort({ createdAt: -1 }).limit(5).select("name message createdAt").lean(),
      Project.find().sort({ createdAt: -1 }).limit(3).select("title createdAt").lean(),
      ReadymadeSolution.find().sort({ createdAt: -1 }).limit(3).select("title createdAt").lean(),
    ]);

    // Normalize to a continuous 6-month series
    const months: { label: string; count: number }[] = [];
    const cursor = new Date(since);
    for (let i = 0; i < 6; i++) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const hit = monthlyRaw.find(
        (r: any) => r._id.y === y && r._id.m === m,
      );
      months.push({
        label: cursor.toLocaleString("en", { month: "short" }),
        count: hit ? hit.count : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Merge a simple recent-activity feed
    const activity = [
      ...recentEnquiries.map((e: any) => ({
        type: "enquiry",
        title: `Enquiry from ${e.name}`,
        detail: String(e.message || "").slice(0, 80),
        at: e.createdAt,
      })),
      ...recentProjects.map((p: any) => ({
        type: "project",
        title: `Project added: ${p.title}`,
        detail: "",
        at: p.createdAt,
      })),
      ...recentSolutions.map((s: any) => ({
        type: "solution",
        title: `Solution added: ${s.title}`,
        detail: "",
        at: s.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      stats: { projects, solutions, services, enquiries, users },
      months,
      activity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
