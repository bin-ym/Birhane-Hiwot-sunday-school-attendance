import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

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
      ["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miyazya","Ginbot","Sene","Hamle","Nehasse"].map(
        (m) => [m, "Not Paid"]
      )
    );
    const insertResult = await collection.insertOne({ academicYear: year, studentId, data: emptyData });
    record = await collection.findOne({ _id: insertResult.insertedId });
  }

  if (!record) {
    return NextResponse.json({ error: "Record not found after creation" }, { status: 500 });
  }
  return NextResponse.json(record.data, { status: 200 });
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();
  const { year, studentId, data } = body;

  if (!year || !studentId || typeof data !== "object") {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const collection = db.collection("payment_status");

  await collection.updateOne(
    { academicYear: year, studentId },
    { $set: { data } },
    { upsert: true }
  );

  return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
}