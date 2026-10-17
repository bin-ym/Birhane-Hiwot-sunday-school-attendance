// src/app/api/students/count/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { academicYear, grade, classification } = await req.json();
    if (!academicYear || !grade) {
      return NextResponse.json({ error: 'Academic year and grade are required' }, { status: 400 });
    }
    const db = await getDb();
    const filter: any = { Academic_Year: academicYear, Grade: grade };
    if (classification) filter.Classification = classification;
    const count = await db.collection('students').countDocuments(filter);
    return NextResponse.json({ count, academicYear, grade, classification }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to count students' }, { status: 500 });
  }
}