// src/app/api/students/[studentId]/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Student } from '@/lib/models';
import { createSignedQrText } from '@/lib/qr';

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const db = await getDb();
    let student: Student | null = null;

    // Try ObjectId first (MongoDB _id)
    if (ObjectId.isValid(studentId)) {
      student = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
    }

    // If not found by _id, try Unique_ID (school ID)
    if (!student) {
      student = await db.collection<Student>('students').findOne({ Unique_ID: studentId });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ ...student, _id: student._id.toString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch student: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;

    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Valid Student ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const body = await req.json();
    const updateData: Partial<Student> = {};

    // Handle photo upload
    if (body.photo_data_url) {
      updateData.photo_data_url = body.photo_data_url;
    }

    // Handle QR code generation
    if (body.generateQR) {
      const student = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Generate signed QR code with student's Unique_ID
      const qrText = createSignedQrText(student.Unique_ID);
      const QRCode = await import('qrcode');
      const qrCodeDataURL = await QRCode.toDataURL(qrText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      updateData.qr_code = qrCodeDataURL;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = await db.collection<Student>('students').findOneAndUpdate(
      { _id: new ObjectId(studentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ ...result, _id: result._id.toString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update student: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export
  async function PUT(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params;

    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Valid Student ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const body = await req.json();

    // Remove _id from body if present
    delete (body as any)._id;

    // If Unique_ID changed, regenerate QR code
    const existingStudent = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (body.Unique_ID && body.Unique_ID !== existingStudent.Unique_ID) {
      try {
        const qrText = createSignedQrText(body.Unique_ID);
        const QRCode = await import('qrcode');
        body.qr_code = await QRCode.toDataURL(qrText, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (qrError) {
        console.error("Failed to regenerate QR code:", qrError);
      }
    }

    const result = await db.collection<Student>('students').findOneAndUpdate(
      { _id: new ObjectId(studentId) },
      { $set: body },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ ...result, _id: result._id.toString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update student: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
