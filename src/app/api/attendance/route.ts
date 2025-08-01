import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    const attendance = await db.collection('attendance').find({}).toArray();
    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 