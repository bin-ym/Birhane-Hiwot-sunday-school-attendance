// app/api/subjects/[id]/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid subject ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("subjects").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Subject deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting subject:", err);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
