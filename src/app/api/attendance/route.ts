//src/app/api/attendance/route.ts

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { formatEthiopianDate } from "@/lib/utils";
import { ObjectId } from "mongodb";
import { aggregateAttendance } from "@/lib/aggregateAttendance";

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

    const query: any = {};
    if (date) {
      query.date = date;
    }

    const attendance = await db.collection<AttendanceRecord>("attendance").find(query).toArray();
    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, attendance } = await req.json();
    if (!date || !Array.isArray(attendance)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const db = await getDb();
    const timestamp = formatEthiopianDate(new Date());

    // Store in temporary collection
    const tempRecords: AttendanceRecord[] = attendance.map((record: any) => ({
      studentId: record.studentId,
      date: record.date,
      present: record.present,
      hasPermission: record.hasPermission,
      reason: record.reason || "",
      markedBy: record.markedBy || "Attendance Facilitator",
      timestamp: record.timestamp || timestamp,
      submissionId: new ObjectId().toString(),
    }));

    const result = await db.collection<AttendanceRecord>("temp_attendance").insertMany(tempRecords);

    // Schedule aggregation if first submission
    const firstSubmission = await db.collection<AttendanceRecord>("temp_attendance").findOne({ date });
    if (!firstSubmission) {
      setTimeout(async () => {
        const aggregationResult = await aggregateAttendance(date);
        console.log(`Aggregation for ${date}:`, aggregationResult);
      }, 60 * 60 * 1000); // 1 hour delay
    }

    return NextResponse.json(
      {
        success: true,
        message: "Attendance queued for processing",
        insertedCount: result.insertedCount,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Attendance POST error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}