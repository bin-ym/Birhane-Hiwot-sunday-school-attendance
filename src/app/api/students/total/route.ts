// src/app/api/students/total/route.ts
import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    const count = await db.collection('students').countDocuments();
    return NextResponse.json({ total: count }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/students/total:", error);
    return NextResponse.json(
      { error: "Failed to count students" },
      { status: 500 }
    );
  }
}