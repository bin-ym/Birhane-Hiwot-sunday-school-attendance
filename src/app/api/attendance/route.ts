// src/app/api/attendance/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { formatEthiopianDate } from "@/lib/utils";
import { withLock } from "@/lib/distributedLock";
import { requireAuth, requireWriteAccess, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const { error } = await requireAuth(req);
  if (error) {
    Object.entries(cors).forEach(([k, v]) => error.headers.set(k, v));
    return error;
  }

  const rl = await enforceRateLimit(req, { maxRequests: 60, windowMs: 60_000 });
  if (rl) {
    Object.entries(cors).forEach(([k, v]) => rl.headers.set(k, v));
    return rl;
  }

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const studentId = url.searchParams.get("studentId");
    const limitParam = url.searchParams.get("limit");
    const summary = url.searchParams.get("summary") === "true";
    const grades = url.searchParams.getAll("grade");
    const academicYear = url.searchParams.get("academicYear");

    const query: any = {};
    if (date) query.date = date;
    if (studentId) query.studentId = studentId;

    // Per-grade scoping: attendance rows don't store a grade, so resolve the
    // student IDs for the requested grade(s) first, then filter by those IDs.
    // Lets facilitators/dashboards count only their own classes.
    if (grades.length > 0) {
      const studentFilter: any = { Grade: { $in: grades } };
      if (academicYear) studentFilter.Academic_Year = academicYear;
      const studentDocs = await db
        .collection("students")
        .find(studentFilter, { projection: { _id: 1 } })
        .toArray();
      const studentIds = studentDocs.map((s) => s._id.toString());
      if (studentIds.length === 0) {
        if (summary) return NextResponse.json({ total: 0, present: 0 }, { status: 200, headers: cors });
        return NextResponse.json([], { status: 200, headers: cors });
      }
      query.studentId = { $in: studentIds };
    }

    const collection = db.collection("attendance");

    // Summary mode: return counts only — used by dashboards instead of
    // downloading the entire attendance collection just to compute a rate.
    if (summary) {
      const [total, present] = await Promise.all([
        collection.countDocuments(query),
        collection.countDocuments({ ...query, present: true }),
      ]);
      return NextResponse.json({ total, present }, { status: 200, headers: cors });
    }

    let find = collection.find(query).sort({ _id: -1 });
    const limit = parseInt(limitParam || "0", 10);
    if (limit > 0) find = find.limit(limit);

    const attendance = await find.toArray();
    return NextResponse.json(attendance, { status: 200, headers: cors });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const { token, error } = await requireWriteAccess(req);
  if (error) {
    Object.entries(cors).forEach(([k, v]) => error.headers.set(k, v));
    return error;
  }

  const rl = await enforceRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rl) {
    Object.entries(cors).forEach(([k, v]) => rl.headers.set(k, v));
    return rl;
  }

  try {
    const { date, attendance } = await req.json();
    if (!date || !Array.isArray(attendance)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400, headers: cors });
    }
    const db = await getDb();
    const timestamp = formatEthiopianDate(new Date()); // Use Ethiopian date for timestamp

    // Serialize bulk marking per date so concurrent double-submits can't insert
    // duplicate attendance rows. Gracefully no-ops without Redis.
    const lockKey = `lock:attendance:${date}`;
    const result = await withLock(
      lockKey,
      async () => {
        // Idempotent upsert keyed on (studentId, date): re-submitting the same
        // date updates existing rows instead of inserting duplicates, so
        // facilitators can still correct marks on a second submit.
        const operations = attendance.map((record: any) => ({
          updateOne: {
            filter: { studentId: record.studentId, date: record.date || date },
            update: {
              $set: {
                present: record.present,
                hasPermission: record.hasPermission,
                reason: record.reason || "",
                markedBy: record.markedBy || "Attendance Facilitator", // Default to role; replace with actual user ID if available
                timestamp: record.timestamp || timestamp,
              },
            },
            upsert: true,
          },
        }));
        return db.collection("attendance").bulkWrite(operations);
      },
      { ttlMs: 15_000, waitMs: 10_000 },
    );
    // Audit log
    logAudit({
      action: "update",
      collection: "attendance",
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Attendance submitted for ${date}: ${result.upsertedCount} new, ${result.modifiedCount} updated`,
    });

    // Notify admins about attendance submission
    const total = result.upsertedCount + result.modifiedCount;
    if (total > 0) {
      createNotification({
        type: "attendance_submitted",
        title: "Attendance Submitted",
        message: `${String(token.name || token.email || "Facilitator")} submitted attendance for ${date} (${total} records).`,
        targetRoles: ["Super Admin", "HR Admin"],
        href: "/super-admin/reports",
      });
    }

    return NextResponse.json(
      {
        success: true,
        insertedCount: result.upsertedCount,
        updatedCount: result.modifiedCount,
      },
      { status: 200, headers: cors },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500, headers: cors });
  }
}