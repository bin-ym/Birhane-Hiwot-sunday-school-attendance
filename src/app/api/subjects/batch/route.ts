// app/api/subjects/batch/route.ts
// POST /api/subjects/batch — batch-create subjects grouped by academicYear + grade.
//
// Body: { subjects: [{ name, grade, gradeNumber, academicYear }, ...] }
//
// Groups the incoming subjects by academicYear+grade, then for each group:
// - If a group doc already exists, pushes new subject names (skips duplicates).
// - If not, creates a new group doc.

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { subjects } = body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: "Subjects array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Validate each subject
    for (const subject of subjects) {
      if (!subject.name || !subject.grade || !subject.academicYear) {
        return NextResponse.json(
          {
            error: `Missing required fields for subject "${subject.name || "(unnamed)"}"`,
          },
          { status: 400 },
        );
      }
    }

    // Group incoming subjects by grade+academicYear
    const groupMap = new Map<
      string,
      { grade: string; gradeNumber?: number; academicYear: string; names: string[] }
    >();

    for (const s of subjects) {
      const key = `${s.grade}|||${s.academicYear}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          grade: s.grade,
          gradeNumber: s.gradeNumber,
          academicYear: s.academicYear,
          names: [],
        });
      }
      groupMap.get(key)!.names.push(s.name);
    }

    const collection = db.collection("subjects");
    const results: { name: string; status: "created" | "exists" | "error"; error?: string }[] = [];

    for (const [, group] of groupMap) {
      try {
        const existing = await collection.findOne({
          grade: group.grade,
          academicYear: group.academicYear,
        });

        if (existing) {
          const existingNames = new Set(
            (existing.subjects || []) as string[],
          );

          for (const name of group.names) {
            if (existingNames.has(name)) {
              results.push({ name, status: "exists" });
            } else {
              await collection.updateOne(
                { _id: existing._id },
                { $push: { subjects: name } } as any,
              );
              results.push({ name, status: "created" });
            }
          }
        } else {
          // Create new group with all subjects at once
          const doc: Record<string, unknown> = {
            academicYear: group.academicYear,
            grade: group.grade,
            subjects: group.names,
          };
          if (group.gradeNumber !== undefined && group.gradeNumber !== null) {
            doc.gradeNumber = group.gradeNumber;
          }
          await collection.insertOne(doc);

          for (const name of group.names) {
            results.push({ name, status: "created" });
          }
        }
      } catch (err) {
        for (const name of group.names) {
          results.push({
            name,
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const exists = results.filter((r) => r.status === "exists").length;
    const errors = results.filter((r) => r.status === "error");

    return NextResponse.json(
      {
        results,
        summary: {
          total: results.length,
          created,
          exists,
          errors: errors.length,
        },
      },
      { status: errors.length > 0 ? 207 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to batch create subjects" },
      { status: 500 },
    );
  }
}
