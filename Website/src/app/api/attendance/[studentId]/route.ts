// src/app/api/attendance/[studentId]/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Attendance } from '@/lib/imports';

export async function GET(req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const { studentId } = params;
    console.log('Fetching attendance for studentId:', studentId);

    if (!studentId) {
      console.error('Missing studentId');
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const db = await getDb();
    console.log('Connected to MongoDB');
    const attendance = await db
      .collection<Attendance>('attendance')
      .find({ studentId })
      .toArray();
    console.log('Attendance records:', attendance);

    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    console.error('Error in /api/attendance/[studentId]:', error);
    return NextResponse.json({ error: `Failed to fetch attendance: ${(error as Error).message}` }, { status: 500 });
  }
}