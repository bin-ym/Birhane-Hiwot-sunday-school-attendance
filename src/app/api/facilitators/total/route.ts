// src/app/api/facilitators/total/route.ts
import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    const count = await db
      .collection('users')
      .countDocuments({ role: { $in: ['Attendance Facilitator', 'Education Facilitator'] } });
    return NextResponse.json({ total: count }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/facilitators/total:", error);
    return NextResponse.json(
      { error: "Failed to count facilitators" },
      { status: 500 }
    );
  }
}