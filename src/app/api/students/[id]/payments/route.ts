import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    const db = await getDb();
    const payments = await db
      .collection('payments')
      .find({ studentId: id })
      .toArray();
    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}