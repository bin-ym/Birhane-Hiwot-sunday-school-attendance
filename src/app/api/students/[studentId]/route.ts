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
    if (!ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
    }
    const db = await getDb();
    const student = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ ...student, _id: student._id.toString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch student: ${(error as Error).message}` }, { status: 500 });
  }
}