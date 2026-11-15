// app/api/subjects/[id]/route.ts
// DELETE /api/subjects/[groupId]  — remove a subject from a group by name.
// Body: { name: "subject name to remove" }
// If the group has no subjects left after removal, the group doc is deleted.

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Subject name is required in request body" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection("subjects");

    // Pull the subject string from the group's subjects array
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { subjects: name } } as any,
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Subject group not found" },
        { status: 404 },
      );
    }

    // Check how many subjects remain
    const group = await collection.findOne({ _id: new ObjectId(id) });
    const remaining = group?.subjects?.length ?? 0;

    if (remaining === 0) {
      // Delete the empty group
      await collection.deleteOne({ _id: new ObjectId(id) });
    }

    return NextResponse.json(
      {
        message: "Subject removed successfully",
        remaining,
        deleted: remaining === 0,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error deleting subject:", err);
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 },
    );
  }
}
