import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ReadymadeSolution from "@/models/ReadymadeSolution";

export async function GET() {
  try {
    await dbConnect();
    const solutions = await ReadymadeSolution.find()
    return NextResponse.json({ success: true, data: solutions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    const { title, technologies, colorConfig, media } = data;

    if (!media) {
      return NextResponse.json({ success: false, message: "Image is required" }, { status: 400 });
    }

    const solution = await ReadymadeSolution.create({
      title,
      technologies,
      colorConfig,
      media
    });

    return NextResponse.json({ success: true, data: solution, message: "Solution created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
