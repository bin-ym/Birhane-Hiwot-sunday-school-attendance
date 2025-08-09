import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { Student, Attendance } from '@/lib/models';
import { formatEthiopianDate } from '@/lib/utils';

// Fetch student and their attendance records
async function fetchStudentResult(rid: string): Promise<{ student: Student | null; attendance: Attendance[] } | null> {
  try {
    const db = await getDb();
    const studentCollection = db.collection<Student>('students');
    const attendanceCollection = db.collection<Attendance>('attendance');

    // Validate rid as ObjectId
    if (!ObjectId.isValid(rid)) {
      return null;
    }

    // Fetch student by _id, converting rid to ObjectId
    const student = await studentCollection.findOne({ _id: rid });
    if (!student) {
      return null;
    }

    // Fetch attendance records for the student
    const attendance = await attendanceCollection
      .find({ studentId: rid })
      .toArray();

    // Format attendance dates to Ethiopian calendar
    const formattedAttendance = attendance.map((record) => ({
      ...record,
      date: formatEthiopianDate(new Date(record.date)),
    }));

    return { student, attendance: formattedAttendance };
  } catch (error) {
    console.error('Error fetching student result:', error);
    return null;
  }
}

// GET handler for student result by rid
export async function GET(request: NextRequest, context: { params: Promise<{ rid: string }> }) {
  try {
    const params = await context.params; // Await the params Promise
    const { rid } = params;
    if (!rid) {
      return NextResponse.json({ error: 'Result ID is required' }, { status: 400 });
    }

    const result = await fetchStudentResult(rid);
    if (!result || !result.student) {
      return NextResponse.json({ error: 'Student result not found' }, { status: 404 });
    }

    return NextResponse.json({
      student: {
        _id: result.student._id ? result.student._id.toString() : '',
        Unique_ID: result.student.Unique_ID,
        First_Name: result.student.First_Name,
        Father_Name: result.student.Father_Name,
        Grade: result.student.Grade,
        Academic_Year: result.student.Academic_Year,
      },
      attendance: result.attendance,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch student result' }, { status: 500 });
  }
}

// Generate static parameters for all student IDs
export async function generateStaticParams() {
  try {
    const db = await getDb();
    const studentCollection = db.collection<Student>('students');
    const students = await studentCollection
      .find({}, { projection: { _id: 1 } })
      .toArray();
    return students.map((student) => ({ rid: student._id.toString() }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}