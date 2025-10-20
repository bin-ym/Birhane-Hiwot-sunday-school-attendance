import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { StudentRequest } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const requests = await db
      .collection<StudentRequest>('student_requests')
      .find(query)
      .toArray();

    const serializedRequests = requests.map((request) => ({
      ...request,
      _id: request._id?.toString(),
    }));

    return NextResponse.json(serializedRequests, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body: {
      studentData: Omit<any, "_id">,
      requestedBy: string,
      requestedByName: string
    } = await req.json();

    if (!body || !body.studentData) {
      return NextResponse.json({ error: 'studentData is required' }, { status: 400 });
    }

    // Build the request document
    const doc: any = {
      studentData: body.studentData,
      requestedBy: body.requestedBy || "Admin",
      requestedByName: body.requestedByName || "",
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await db.collection<StudentRequest>('student_requests').insertOne(doc);
    return NextResponse.json({ _id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const { id, status, approvedBy, rejectionReason } = await req.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (status === 'approved' || status === 'rejected') {
      updateData.processedAt = new Date();
    }

    const result = await db
      .collection<StudentRequest>('student_requests')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Request updated' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}