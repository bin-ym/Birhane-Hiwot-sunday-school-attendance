// app/api/subjects/route.ts
// Subjects API — grouped by academic year + grade.
//
// DB shape (subjects collection):
//   { _id, academicYear, grade, gradeNumber, subjects: ["subject1", ...] }
//
// GET  /api/subjects                → returns all grouped docs
// GET  /api/subjects?grade=X        → filter by grade
// GET  /api/subjects?gradeNumber=N  → filter by numeric grade
// GET  /api/subjects?academicYear=Y → filter by year
// POST /api/subjects                → add a subject to a group (or create group)

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const grade = url.searchParams.get("grade");
    const gradeNumber = url.searchParams.get("gradeNumber");
    const academicYear = url.searchParams.get("academicYear");

    const query: Record<string, unknown> = {};
    if (grade) query.grade = grade;
    if (gradeNumber) query.gradeNumber = Number(gradeNumber);
    if (academicYear) query.academicYear = academicYear;

    const groups = await db.collection("subjects").find(query).toArray();

    const result = groups.map((g) => ({
      _id: g._id.toString(),
      academicYear: g.academicYear,
      grade: g.grade,
      gradeNumber: g.gradeNumber,
      subjects: g.subjects || [],
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { name, grade, gradeNumber, academicYear } = await req.json();

    if (!name || !grade || !academicYear) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, grade, and academicYear are required",
        },
        { status: 400 },
      );
    }

    const collection = db.collection("subjects");

    // Find existing group for this academicYear + grade
    const existing = await collection.findOne({ academicYear, grade });

    if (existing) {
      const subjects: string[] = existing.subjects || [];
      if (subjects.includes(name)) {
        return NextResponse.json(
          { error: "Subject already exists for this grade and academic year" },
          { status: 409 },
        );
      }

      // Add subject to existing group
      await collection.updateOne(
        { _id: existing._id },
        { $push: { subjects: name } } as any,
      );

      return NextResponse.json(
        {
          _id: existing._id.toString(),
          academicYear,
          grade,
          gradeNumber: gradeNumber ?? existing.gradeNumber ?? null,
          subjects: [...subjects, name],
        },
        { status: 201 },
      );
    }

    // Create new group
    const doc: Record<string, unknown> = {
      academicYear,
      grade,
      subjects: [name],
    };
    if (gradeNumber !== undefined && gradeNumber !== null) {
      doc.gradeNumber = gradeNumber;
    }

    const result = await collection.insertOne(doc);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        academicYear,
        grade,
        gradeNumber: gradeNumber ?? null,
        subjects: [name],
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 },
    );
  }
}