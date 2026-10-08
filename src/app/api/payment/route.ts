import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ETHIOPIAN_MONTHS } from "@/lib/utils";
import { requireAuth, requireRole, requirePermission, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { validatePaymentPayload } from "@/lib/validation";

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

    const monthlyEditCounts: Record<string, number> = record.monthlyEditCounts || {};
    const lockedMonths = Object.entries(monthlyEditCounts)
      .filter(([_, count]) => (count as number) >= 2)
      .map(([m]) => m);

    return NextResponse.json(
      {
        academicYear: record.academicYear,
        studentId: record.studentId,
        data: record.data,
        monthlyEditCounts,
        lockedMonths,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, "payment:write");
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const body = await req.json();
    const validation = validatePaymentPayload(body);

    if (!validation.valid) {
      return NextResponse.json({ message: validation.error || "Invalid request" }, { status: 400 });
    }

    const { year, studentId, data } = body;
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

    // Fetch existing record to check month-level edit limits
    const existingRecord = typeof collection.findOne === "function" 
      ? await collection.findOne({ academicYear: year, studentId })
      : null;
    const existingData = existingRecord?.data || {};
    const existingMonthlyCounts: Record<string, number> = existingRecord?.monthlyEditCounts || {};
    const updatedMonthlyCounts: Record<string, number> = { ...existingMonthlyCounts };
    const changedMonths: string[] = [];

    // Evaluate each month individually
    for (const m of ETHIOPIAN_MONTHS) {
      const oldMonth = existingData[m];
      let oldStatus = "Not Paid";
      let oldAmount = "";
      if (typeof oldMonth === "object" && oldMonth !== null) {
        oldStatus = oldMonth.status === "Paid" ? "Paid" : "Not Paid";
        oldAmount = String(oldMonth.amount || "").trim();
      } else if (oldMonth === "Paid") {
        oldStatus = "Paid";
      }

      const newMonth = normalizedData[m];
      const newStatus = newMonth.status;
      const newAmount = String(newMonth.amount || "").trim();

      const isChanged = oldStatus !== newStatus || oldAmount !== newAmount;
      if (isChanged) {
        const currentCount = existingMonthlyCounts[m] || 0;
        if (currentCount >= 2) {
          return NextResponse.json(
            { message: `Payment for ${m} is locked after 2 edits and cannot be modified.` },
            { status: 403 },
          );
        }
        changedMonths.push(m);
        updatedMonthlyCounts[m] = currentCount + 1;
      }
    }

    await collection.updateOne(
      { academicYear: year, studentId },
      { 
        $set: { 
          data: normalizedData,
          monthlyEditCounts: updatedMonthlyCounts,
        },
      },
      { upsert: true },
    );

    return NextResponse.json(
      { 
        message: "Saved successfully", 
        monthlyEditCounts: updatedMonthlyCounts,
        changedMonths,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
