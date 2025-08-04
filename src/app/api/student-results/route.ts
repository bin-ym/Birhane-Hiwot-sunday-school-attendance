import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTodayEthiopianDateISO } from "@/lib/utils";

export interface StudentResult {
  _id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  academicYear: string;
  assignment1?: number;
  assignment2?: number;
  midTest?: number;
  finalExam?: number;
  totalScore?: number;
  average?: number;
  grade?: string;
  remarks?: string;
  recordedDate: string;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const results = await db.collection("student_results").find({}).toArray();
    const transformedResults = results.map((result) => ({
      ...result,
      _id: result._id.toString(),
    }));
    return NextResponse.json(transformedResults, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student results" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const resultData = await req.json();

    // Validate required fields
    if (
      !resultData.studentId ||
      !resultData.subjectId ||
      !resultData.grade ||
      !resultData.academicYear
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: studentId, subjectId, grade, and academicYear are required",
        },
        { status: 400 }
      );
    }

    // Check if result already exists for this student and subject
    const existing = await db.collection("student_results").findOne({
      studentId: resultData.studentId,
      subjectId: resultData.subjectId,
      grade: resultData.grade,
      academicYear: resultData.academicYear,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Result already exists for this student and subject" },
        { status: 409 }
      );
    }

    // Calculate total score and average
    const scores = [
      resultData.assignment1,
      resultData.assignment2,
      resultData.midTest,
      resultData.finalExam,
    ].filter((score) => score !== undefined && score !== null);

    const totalScore = scores.reduce((sum, score) => sum + (score || 0), 0);
    const average = scores.length > 0 ? totalScore / scores.length : 0;

    // Determine grade based on average
    let grade = "F";
    if (average >= 90) grade = "A+";
    else if (average >= 80) grade = "A";
    else if (average >= 70) grade = "B+";
    else if (average >= 60) grade = "B";
    else if (average >= 50) grade = "C+";
    else if (average >= 40) grade = "C";
    else if (average >= 30) grade = "D";

    const result = {
      ...resultData,
      totalScore,
      average,
      grade,
      recordedDate: getTodayEthiopianDateISO(),
    };

    const insertResult = await db
      .collection("student_results")
      .insertOne(result);

    return NextResponse.json(
      {
        _id: insertResult.insertedId.toString(),
        ...result,
        totalScore,
        average,
        grade,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create student result" },
      { status: 500 }
    );
  }
}
