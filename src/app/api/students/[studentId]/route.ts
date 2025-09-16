// src/app/api/students/[studentId]/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Student } from '@/lib/models';

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const db = await getDb();
    let student: Student | null = null;

    // Try ObjectId first (MongoDB _id)
    if (ObjectId.isValid(studentId)) {
      student = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
    }

    // If not found by _id, try Unique_ID (school ID)
    if (!student) {
      student = await db.collection<Student>('students').findOne({ Unique_ID: studentId });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ ...student, _id: student._id.toString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch student: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}