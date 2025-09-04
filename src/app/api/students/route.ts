// src/app/api/students/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Student } from '@/lib/models';

export async function GET() {
  try {
    const db = await getDb();
    const students = await db.collection<Student>('students').find({}).toArray();
    // Convert _id to string for client-side compatibility
    const serializedStudents = students.map((student) => ({
      ...student,
      _id: student._id.toString(),
    }));
    return NextResponse.json(serializedStudents, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body: Student = await req.json();

    // Validate required fields
    const requiredFields = ['Unique_ID', 'First_Name', 'Father_Name', 'Academic_Year', 'Grade'];
    for (const field of requiredFields) {
      if (!body[field as keyof Student]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const result = await db.collection<Student>('students').insertOne(body);
    return NextResponse.json({ _id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const result = await db.collection<Student>('students').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Student deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}