// src/app/api/students/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Student, UserRole } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const grades = searchParams.getAll("grade");

    const query: any = {};

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

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body: Omit<Student, '_id'> & { userRole?: UserRole } = await req.json();
    const userRole = body.userRole || "Admin";

    const requiredFields = ['Unique_ID', 'First_Name', 'Father_Name', 'Academic_Year', 'Grade'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Check if this is a new student by seeing if Unique_ID already exists
    const existingStudent = await db.collection('students').findOne({ 
      Unique_ID: body.Unique_ID 
    });
    
    const isNewStudent = !existingStudent; // True if no existing student with this ID

    // ✅ ENFORCE grade restrictions for Attendance Facilitator on NEW students
    if (userRole === "Attendance Facilitator" && isNewStudent) {
      const restrictedGrades = [4, 6, 8, 12];
      const gradeNumber = parseInt(body.Grade.match(/\d+/)?.[0] || "0");
      
      if (restrictedGrades.includes(gradeNumber)) {
        return NextResponse.json({ 
          error: `Grade ${gradeNumber} is restricted for Attendance Facilitators. Please use "Request Admin Approval" instead.`,
          code: 'RESTRICTED_GRADE'
        }, { status: 403 });
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