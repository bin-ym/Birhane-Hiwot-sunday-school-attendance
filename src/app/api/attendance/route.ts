// src/app/api/attendance/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { formatEthiopianDate } from "@/lib/utils";
import { withLock } from "@/lib/distributedLock";
import { requireAuth, requireRole, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { validateAttendanceSubmission } from "@/lib/validation";

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

    const collection = db.collection("attendance");

    // Per-grade scoping: attendance rows store a denormalized `Grade` (written
    // by POST and backfilled by scripts/backfill-attendance-grade.mjs). Use it
    // directly; for older rows lacking Grade, resolve student IDs — but only
    // when the result set is bounded, so a 100k-student grade never produces a
    // giant $in array per dashboard request.
    if (grades.length > 0) {
      query.Grade = { $in: grades };
      const limit = parseInt(limitParam || "0", 10);
      const hasOldRows =
        (await collection.countDocuments({ Grade: { $exists: false } }, { limit: 1 })) > 0;
      if (hasOldRows && (limit > 0 || summary)) {
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
        // Old rows have no Grade: match new rows via Grade OR old rows via studentId
        query.$or = [{ Grade: { $in: grades } }, { studentId: { $in: studentIds } }];
        delete query.Grade;
      }
    }

    // Summary mode: return counts only — used by dashboards instead of
    // downloading the entire attendance collection just to compute a rate.
    if (summary) {
      const [total, present] = await Promise.all([
        collection.countDocuments(query),
        collection.countDocuments({ ...query, present: true }),
      ]);
      return NextResponse.json({ total, present }, { status: 200, headers: cors });
    }

    // Hard cap on unbounded list requests — prevents a single dashboard from
    // dragging the whole collection over the wire at scale.
    const MAX_LIST_LIMIT = 10_000;
    let limit = parseInt(limitParam || "0", 10);
    if (limit <= 0 || limit > MAX_LIST_LIMIT) limit = MAX_LIST_LIMIT;
    const attendance = await collection
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json(attendance, { status: 200, headers: cors });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const { token, error } = await requireRole(req, "Super Admin", "HR Admin", "Attendance Facilitator");
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
    const payload = await req.json();
    const validation = validateAttendanceSubmission(payload);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid request data" }, { status: 400, headers: cors });
    }

    const { date, attendance } = payload;
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
                // Denormalized for O(1) grade-scoped queries without $in on
                // thousands of student IDs (see GET below).
                ...(record.grade ? { Grade: record.grade } : {}),
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