// src/app/api/student-results/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTodayEthiopianDateISO } from "@/lib/utils";

/**
 * A single result document
 */
export interface StudentResult {
  _id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  assignment1?: number; // 0‑10 pts
  assignment2?: number; // 0‑10 pts
  midTest?: number;     // 0‑30 pts
  finalExam?: number;   // 0‑50 pts
  totalScore?: number;  // 0‑100 pts  (sum of the four components)
  average?: number;     // legacy – not used for grading
  grade?: string;       // A+, A, A‑ … etc.
  remarks?: string;
  recordedDate: string; // Ethiopia‑ISO string
}

/**
 * GET /api/student-results
 * Returns all results
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const results = await db.collection("student_results").find({}).toArray();
    const transformed = results.map(r => ({
      ...r,
      _id: r._id.toString()
    }));
    return NextResponse.json(transformed, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch student results" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-results
 * Creates a new result
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const data = await req.json();

    /* ------------------------------------------------------------------
     * Basic validation (we only need studentId, subjectId,
     * academicYear – other fields default to 0)
     * ------------------------------------------------------------------ */
    if (!data.studentId || !data.subjectId || !data.academicYear) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, subjectId, academicYear" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------------------------
     * Ensure uniqueness: one set of scores per subject per year
     * ------------------------------------------------------------------ */
    const existing = await db.collection("student_results").findOne({
      studentId: data.studentId,
      subjectId: data.subjectId,
      academicYear: data.academicYear
    });

    if (existing) {
      return NextResponse.json(
        { error: "Result already exists for this student and subject in this academic year" },
        { status: 409 }
      );
    }

    /* ------------------------------------------------------------------
     * Calculate weighted total (each component’s max = its weight)
     * ------------------------------------------------------------------ */
    const assignment1 = Number(data.assignment1 ?? 0);
    const assignment2 = Number(data.assignment2 ?? 0);
    const midTest     = Number(data.midTest ?? 0);
    const finalExam   = Number(data.finalExam ?? 0);

    const totalScore = assignment1 + assignment2 + midTest + finalExam;

    /* ------------------------------------------------------------------
     * Compute grade solely from totalScore (0‑100) – university logic
     * ------------------------------------------------------------------ */
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

    const grade = getUniversityGrade(totalScore);

    /* ------------------------------------------------------------------
     * Optional field: average – kept only if you still want to store it
     * ------------------------------------------------------------------ */
    const average = totalScore / 4; // divides by number of components for legacy

    const result: Omit<StudentResult, "_id"> = {
      studentId: data.studentId,
      studentName: data.studentName ?? "",
      subjectId: data.subjectId,
      subjectName: data.subjectName ?? "",
      academicYear: data.academicYear,
      assignment1,
      assignment2,
      midTest,
      finalExam,
      totalScore,
      average,
      grade,
      remarks: data.remarks ?? "",
      recordedDate: getTodayEthiopianDateISO()
    };

    const { insertedId } = await db.collection("student_results").insertOne(result);

    return NextResponse.json(
      { _id: insertedId.toString(), ...result, totalScore, average, grade },
      { status: 201 }
    );

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create student result" },
      { status: 500 }
    );
  }
}