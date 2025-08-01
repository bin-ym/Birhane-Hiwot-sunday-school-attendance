// src/app/api/students/count/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { academicYear, grade } = await req.json();
    if (!academicYear || !grade) {
      return NextResponse.json({ error: 'Academic year and grade are required' }, { status: 400 });
    }
    const db = await getDb();
    const count = await db.collection('students').countDocuments({ Academic_Year: academicYear, Grade: grade });
    return NextResponse.json({ count, academicYear, grade }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to count students' }, { status: 500 });
  }
}