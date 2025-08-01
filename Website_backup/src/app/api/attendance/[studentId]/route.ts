// src/app/api/attendance/[studentId]/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Attendance } from '@/lib/imports';

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    const db = await getDb();
    const attendance = await db
      .collection<Attendance>('attendance')
      .find({ studentId })
      .toArray();
    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch attendance: ${(error as Error).message}` }, { status: 500 });
  }
}