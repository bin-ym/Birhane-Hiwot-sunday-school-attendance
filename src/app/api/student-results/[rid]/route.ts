// src/app/api/student-results/[rid]/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: { rid: string } }
) {
  try {
    const id = params.rid;
    const db = await getDb();
    const result = await db
      .collection("student_results")
      .findOne({ _id: new ObjectId(id) });
    if (!result) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }
    // stringify _id
    return NextResponse.json(
      { ...result, _id: result._id.toString() },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { rid: string } }
) {
  try {
    const id = params.rid;
    const db = await getDb();
    const { deletedCount } = await db
      .collection("student_results")
      .deleteOne({ _id: new ObjectId(id) });
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: "Result deleted" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete result" },
      { status: 500 }
    );
  }
}