// src/app/api/students/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Student } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const grades = searchParams.getAll("grade"); // Use .getAll() to get an array of grades

    const query: any = {};

    // If grade parameters exist, filter by them using the $in operator
    if (grades && grades.length > 0) {
      query.Grade = { $in: grades };
    }

    const students = await db.collection<Student>('students').find(query).toArray();
    
    const serializedStudents = students.map((student) => ({
      ...student,
      _id: student._id.toString(),
    }));
    
    return NextResponse.json(serializedStudents, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Your POST and DELETE handlers are fine, no changes needed there.
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body: Omit<Student, '_id'> = await req.json();

    const requiredFields = ['Unique_ID', 'First_Name', 'Father_Name', 'Academic_Year', 'Grade'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const result = await db.collection('students').insertOne(body as Student);
    return NextResponse.json({ _id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { id } = await req.json();
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
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