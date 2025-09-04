//app/api/subjects/route.ts

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export interface Subject {
  _id?: string;
  name: string;
  grade: string;
  academicYear: string;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const subjects = await db.collection("subjects").find({}).toArray();

    // Transform _id to string
    const transformedSubjects = subjects.map((subject) => ({
      ...subject,
      _id: subject._id.toString(),
    }));

    return NextResponse.json(transformedSubjects, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { name, grade, academicYear } = await req.json();

    // Validate required fields
    if (!name || !grade || !academicYear) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, grade, and academicYear are required",
        },
        { status: 400 }
      );
    }

    // Check if subject already exists for this grade and academic year
    const existing = await db.collection("subjects").findOne({
      name,
      grade,
      academicYear,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Subject already exists for this grade and academic year" },
        { status: 409 }
      );
    }

    const result = await db.collection("subjects").insertOne({
      name,
      grade,
      academicYear,
    });

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        grade,
        academicYear,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}