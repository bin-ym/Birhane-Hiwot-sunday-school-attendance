// src/app/api/students/check-duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Student } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const { First_Name, Father_Name, Grandfather_Name, Mothers_Name, Sex } = await req.json();
    if (!First_Name || !Father_Name || !Grandfather_Name || !Mothers_Name || !Sex) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const db = await getDb();
    const existingStudent = await db.collection<Student>('students').findOne({
      First_Name,
      Father_Name,
      Grandfather_Name,
      Mothers_Name,
      Sex,
    });
    return NextResponse.json({ exists: !!existingStudent }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to check duplicate' }, { status: 500 });
  }
}