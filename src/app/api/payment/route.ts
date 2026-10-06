import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ETHIOPIAN_MONTHS } from "@/lib/utils";
import { requireAuth, requireRole, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 60, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const studentId = url.searchParams.get("studentId");

    if (!year || !studentId) {
      return NextResponse.json(
        { message: "Year and studentId are required" },
        { status: 400 },
      );
    }

    const collection = db.collection("payment_status");

    // Try to find existing record
    let record = await collection.findOne({ academicYear: year, studentId });

    // If not found, initialize with "Not Paid" for all months
    if (!record) {
      const emptyData = Object.fromEntries(
        ETHIOPIAN_MONTHS.map((m) => [m, "Not Paid"]),
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
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        academicYear: record.academicYear,
        studentId: record.studentId,
        data: record.data,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(req, "Super Admin", "HR Admin", "Attendance Facilitator");
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const body = await req.json();
    const { year, studentId, data } = body;

    if (!year || !studentId || typeof data !== "object") {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const collection = db.collection("payment_status");

    // Normalize against ETHIOPIAN_MONTHS (prevents overwriting with partial data)
    const normalizedData = Object.fromEntries(
      ETHIOPIAN_MONTHS.map((m) => {
        const monthData = data[m];
        let status = "Not Paid";
        let amount = "";

        if (typeof monthData === "object" && monthData !== null) {
          status = monthData.status === "Paid" ? "Paid" : "Not Paid";
          amount = monthData.amount || "";
        } else if (monthData === "Paid") {
          status = "Paid";
        }

        return [m, { status, amount }];
      }),
    );

    await collection.updateOne(
      { academicYear: year, studentId },
      { $set: { data: normalizedData } },
      { upsert: true },
    );

    return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
