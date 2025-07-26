// src/app/api/students/check-duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface Student {
  _id?: ObjectId;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Sex: string;
}

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