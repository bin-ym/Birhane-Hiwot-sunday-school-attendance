import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = params.id;
    console.log('Fetching attendance for student ID:', id);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }
    const attendance = await db
      .collection('attendance')
      .find({ studentId: id })
      .toArray();
    console.log('Found attendance records:', attendance);
    return NextResponse.json(
      attendance.map((record) => ({
        ...record,
        _id: record._id.toString(),
        studentId: record.studentId.toString(),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}