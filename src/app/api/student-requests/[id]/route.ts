import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { StudentRequest } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const id = req.nextUrl.pathname.split("/").pop(); // get id from URL

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const request = await db
      .collection<StudentRequest>('student_requests')
      .findOne({ _id: new ObjectId(id) });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ ...request, _id: request._id.toString() }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}