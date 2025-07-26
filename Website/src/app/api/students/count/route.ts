// src/app/api/students/count/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { academicYear, grade } = await req.json();
    console.log('Received count request:', { academicYear, grade });

    if (!academicYear || !grade) {
      console.error('Missing academicYear or grade');
      return NextResponse.json({ error: 'Academic Year and Grade are required' }, { status: 400 });
    }

    const db = await getDb();
    console.log('Connected to MongoDB');
    const count = await db.collection('students').countDocuments({ Academic_Year: academicYear, Grade: grade });
    console.log('Count result:', { count, academicYear, grade });

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/students/count:', error);
    return NextResponse.json({ error: `Failed to fetch student count: ${(error as Error).message}` }, { status: 500 });
  }
}