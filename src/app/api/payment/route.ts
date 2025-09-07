import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ETHIOPIAN_MONTHS } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const studentId = url.searchParams.get("studentId");

  if (!year || !studentId) {
    return NextResponse.json(
      { message: "Year and studentId are required" },
      { status: 400 }
    );
  }

  const collection = db.collection("payment_status");

  // Try to find existing record
  let record = await collection.findOne({ academicYear: year, studentId });

  // If not found, initialize with "Not Paid" for all months
  if (!record) {
    const emptyData = Object.fromEntries(
      ETHIOPIAN_MONTHS.map((m) => [m, "Not Paid"])
    );
    const insertResult = await collection.insertOne({
      academicYear: year,
      studentId,
      data: emptyData,
    });
    record = await collection.findOne({ _id: insertResult.insertedId });
  }

  if (!record) {
    return NextResponse.json(
      { error: "Record not found after creation" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { academicYear: record.academicYear, studentId: record.studentId, data: record.data },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();
  const { year, studentId, data } = body;

  if (!year || !studentId || typeof data !== "object") {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const collection = db.collection("payment_status");

  // Normalize against ETHIOPIAN_MONTHS (prevents overwriting with partial data)
  const normalizedData = Object.fromEntries(
    ETHIOPIAN_MONTHS.map((m) => [m, data[m] === "Paid" ? "Paid" : "Not Paid"])
  );

  await collection.updateOne(
    { academicYear: year, studentId },
    { $set: { data: normalizedData } },
    { upsert: true }
  );

  return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
}