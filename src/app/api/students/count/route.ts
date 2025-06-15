// src/app/api/students/count/route.ts
import { getDb } from '../../../../lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    const count = await db.collection('students').countDocuments({});
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}