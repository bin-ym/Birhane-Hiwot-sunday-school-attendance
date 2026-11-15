//src/app/api/attendance/temp/route.ts

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason: string;
  markedBy: string;
  timestamp: string;
  submissionId?: string;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const markedBy = url.searchParams.get("markedBy");

    const query: any = {};
    if (date) query.date = date;
    if (markedBy) query.markedBy = markedBy;

    const tempAttendance = await db
      .collection<AttendanceRecord>("temp_attendance")
      .find(query)
      .toArray();

    return NextResponse.json(tempAttendance, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}