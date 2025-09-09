// src/app/api/attendance/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { formatEthiopianDate } from "@/lib/utils";

export async function GET() {
  try {
    const db = await getDb();
    const attendance = await db.collection("attendance").find({}).toArray();
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
    const timestamp = formatEthiopianDate(new Date()); // Use Ethiopian date for timestamp
    const result = await db.collection("attendance").insertMany(
      attendance.map((record: any) => ({
        studentId: record.studentId,
        date: record.date,
        present: record.present,
        hasPermission: record.hasPermission,
        reason: record.reason || "",
        markedBy: record.markedBy || "Attendance Facilitator", // Default to role; replace with actual user ID if available
        timestamp: record.timestamp || timestamp,
      }))
    );
    return NextResponse.json({ success: true, insertedCount: result.insertedCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}