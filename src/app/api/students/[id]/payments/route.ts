import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = params.id;
    console.log('Fetching payments for student ID:', id);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }
    const payments = await db
      .collection('payments')
      .find({ studentId: id })
      .toArray();
    console.log('Found payment records:', payments);
    return NextResponse.json(
      payments.map((payment) => ({
        ...payment,
        _id: payment._id.toString(),
        studentId: payment.studentId.toString(),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment records' }, { status: 500 });
  }
}