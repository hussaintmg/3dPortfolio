import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ReadymadeSolution from "@/models/ReadymadeSolution";
import { deleteFileFromSupabase } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const updateData = await req.json();

    const { id } = await params;

    // Retrieve old solution artifact to check for existing storage metadata
    const oldSolution = await ReadymadeSolution.findById(id);

    // Decommission old visual artifact from storage if a new one is being decommissioned
    if (
      oldSolution?.media?.storageKey &&
      updateData.media?.storageKey &&
      oldSolution.media.storageKey !== updateData.media.storageKey
    ) {
      await deleteFileFromSupabase(oldSolution.media.storageKey);
    }

    // A cleared price field arrives as "" — store null so the solution drops
    // off the packages page rather than being offered for zero.
    if ("price" in updateData) {
      updateData.price =
        updateData.price === "" || updateData.price == null
          ? null
          : Number(updateData.price);
    }
    if (Array.isArray(updateData.features)) {
      updateData.features = updateData.features.filter(Boolean);
    }

    const solution = await ReadymadeSolution.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: "after" },
    );
    return NextResponse.json({
      success: true,
      data: solution,
      message: "Solution updated",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const solution = await ReadymadeSolution.findById(id);
    if (!solution)
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 },
      );

    // Purge visual assets from storage bucket 'SavedFiles'
    if (solution.media?.storageKey) {
      await deleteFileFromSupabase(solution.media.storageKey);
    }

    await ReadymadeSolution.findByIdAndDelete(id);
    return NextResponse.json({
      success: true,
      message: "Solution decommissioned successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
