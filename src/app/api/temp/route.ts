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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const markedBy = searchParams.get("markedBy");

    // Log incoming request for debugging
    console.log(`GET /api/attendance/temp: date=${date}, markedBy=${markedBy}`);

    // Validate required params
    if (!date) {
      console.warn("GET /api/attendance/temp: Missing 'date' parameter");
      return NextResponse.json(
        { error: "Missing date parameter" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const query: Partial<AttendanceRecord> = { date };

    if (markedBy) {
      query.markedBy = markedBy;
    }

    const tempAttendance = await db
      .collection<AttendanceRecord>("temp_attendance")
      .find(query)
      .toArray();

    console.log(
      `GET /api/attendance/temp: Found ${tempAttendance.length} records`
    );

    return NextResponse.json(tempAttendance, { status: 200 });
  } catch (error) {
    console.error("GET /api/attendance/temp error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}