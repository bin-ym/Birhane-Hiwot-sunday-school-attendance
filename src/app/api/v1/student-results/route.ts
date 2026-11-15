// src/app/api/student-results/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getTodayEthiopianDateISO } from "@/lib/utils";
import { StudentResult } from '@/lib/models';

// GET /api/student-results → return all results or by studentId
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");

    // If studentId provided → filter by it, otherwise return all
    const query = studentId ? { studentId } : {};

    const results = await db.collection<StudentResult>("student_results").find(query).toArray();

    const transformed = results.map(r => ({
      ...r,
      _id: r._id.toString(),
    }));

    return NextResponse.json(transformed, { status: 200 });
  } catch (err) {
    console.error("Error fetching results:", err);
    return NextResponse.json({ error: "Failed to fetch student results" }, { status: 500 });
  }
}

// POST /api/student-results → create new result
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const data = await req.json();

    if (!data.studentId || !data.subjectId || !data.academicYear) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, subjectId, academicYear" },
        { status: 400 }
      );
    }

    // Prevent duplicate results for same student/subject/year
    const existing = await db.collection<StudentResult>("student_results").findOne({
      studentId: data.studentId,
      subjectId: data.subjectId,
      academicYear: data.academicYear,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Result already exists for this student/subject/year" },
        { status: 409 }
      );
    }

    const assignment1 = Number(data.assignment1 ?? 0);
    const assignment2 = Number(data.assignment2 ?? 0);
    const midTest     = Number(data.midTest ?? 0);
    const finalExam   = Number(data.finalExam ?? 0);

    const totalScore = assignment1 + assignment2 + midTest + finalExam;

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
    const average = totalScore; // placeholder

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
      recordedDate: getTodayEthiopianDateISO(),
    };

    const { insertedId } = await db.collection<StudentResult>("student_results").insertOne(result);

    return NextResponse.json(
      { _id: insertedId.toString(), ...result },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating result:", err);
    return NextResponse.json({ error: "Failed to create student result" }, { status: 500 });
  }
}