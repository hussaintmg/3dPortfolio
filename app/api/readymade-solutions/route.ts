import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ReadymadeSolution from "@/models/ReadymadeSolution";

/**
 * Public read of the ready-made solutions.
 *
 * Separate from the dashboard route so the public site never depends on an
 * authenticated endpoint, and so storage keys stay out of the response.
 */
export async function GET() {
  try {
    await dbConnect();
    const docs: any[] = await ReadymadeSolution.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      solutions: docs.map((s) => ({
        _id: String(s._id),
        title: s.title,
        technologies: s.technologies || [],
        colorConfig: s.colorConfig || null,
        media: s.media?.url ? { url: s.media.url, type: s.media.type } : null,
        price: typeof s.price === "number" ? s.price : null,
        currency: s.currency || "USD",
        deliveryNote: s.deliveryNote || "",
        summary: s.summary || "",
        features: s.features || [],
        createdAt: s.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
