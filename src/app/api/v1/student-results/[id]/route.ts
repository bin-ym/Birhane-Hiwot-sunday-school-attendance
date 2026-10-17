// src/app/api/student-results/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { StudentResult } from "@/lib/models";

// GET /api/student-results/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id:string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection<StudentResult>("student_results")
      .findOne({ _id: new ObjectId(id) });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ ...result, _id: result._id.toString() });
  } catch (err) {
    console.error("Error fetching result:", err);
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 }
    );
  }
}

// PUT /api/student-results/:id → update result
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id:string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const data = await req.json();

    const updateData: Partial<StudentResult> = {
      studentName: data.studentName,
      subjectName: data.subjectName,
      assignment1: Number(data.assignment1 ?? 0),
      assignment2: Number(data.assignment2 ?? 0),
      midTest: Number(data.midTest ?? 0),
      finalExam: Number(data.finalExam ?? 0),
      totalScore:
        Number(data.assignment1 ?? 0) +
        Number(data.assignment2 ?? 0) +
        Number(data.midTest ?? 0) +
        Number(data.finalExam ?? 0),
      remarks: data.remarks ?? "",
    };

    // recalc grade
    const getUniversityGrade = (score: number): string => {
      if (score >= 90) return "A+";
      if (score >= 85) return "A";
      if (score >= 80) return "A-";
      if (score >= 75) return "B+";
      if (score >= 70) return "B";
      if (score >= 65) return "B-";
      if (score >= 60) return "C+";
      if (score >= 55) return "C";
      if (score >= 50) return "C-";
      if (score >= 45) return "D";
      return "F";
    };

    updateData.grade = getUniversityGrade(updateData.totalScore ?? 0);
    updateData.average = updateData.totalScore;

    const res = await db
      .collection<StudentResult>("student_results")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (res.matchedCount === 0) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Result updated successfully" });
  } catch (err) {
    console.error("Error updating result:", err);
    return NextResponse.json(
      { error: "Failed to update result" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-results/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id:string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const res = await db
      .collection<StudentResult>("student_results")
      .deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Result deleted successfully" });
  } catch (err) {
    console.error("Error deleting result:", err);
    return NextResponse.json(
      { error: "Failed to delete result" },
      { status: 500 }
    );
  }
}