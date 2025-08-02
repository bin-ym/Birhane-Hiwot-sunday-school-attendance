import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export interface TeacherAssignment {
  _id?: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  academicYear: string;
  assignedDate: string;
  status: "active" | "inactive";
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const assignments = await db
      .collection("teacher_assignments")
      .find({})
      .toArray();

    // Transform _id to string
    const transformedAssignments = assignments.map((assignment) => ({
      ...assignment,
      _id: assignment._id.toString(),
    }));

    return NextResponse.json(transformedAssignments, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch teacher assignments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { teacherId, subjectId, grade, academicYear } = await req.json();

    // Validate required fields
    if (!teacherId || !subjectId || !grade || !academicYear) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: teacherId, subjectId, grade, and academicYear are required",
        },
        { status: 400 }
      );
    }

    // Get teacher details
    const teacher = await db
      .collection("users")
      .findOne({ _id: new ObjectId(teacherId) });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get subject details
    const subject = await db
      .collection("subjects")
      .findOne({ _id: new ObjectId(subjectId) });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if assignment already exists
    const existing = await db.collection("teacher_assignments").findOne({
      teacherId,
      subjectId,
      grade,
      academicYear,
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Assignment already exists for this teacher, subject, grade, and academic year",
        },
        { status: 409 }
      );
    }

    const assignment = {
      teacherId,
      teacherName: teacher.name,
      subjectId,
      subjectName: subject.name,
      grade,
      academicYear,
      assignedDate: new Date().toISOString().split("T")[0],
      status: "active",
    };

    const result = await db
      .collection("teacher_assignments")
      .insertOne(assignment);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        ...assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create teacher assignment" },
      { status: 500 }
    );
  }
}
