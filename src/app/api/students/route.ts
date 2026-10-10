// src/app/api/students/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { Student, UserRole } from "@/lib/models";
import { withLock } from "@/lib/distributedLock";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { requireAuth, requireWriteAccess, sanitizeError } from "@/lib/apiAuth";
import { normalizeRole } from "@/lib/rbac";
import {
  ensureStudentCreationAllowed,
  getStudentListQuery,
  prepareStudentInsertPayload,
  serializeStudent,
  validateStudentCreationBody,
} from "@/lib/studentService";
import type { StudentCreateBody } from "@/lib/studentService";

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

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const { query, uniqueId, limit } = getStudentListQuery(searchParams);

    if (uniqueId) {
      const student = await db.collection<Student>("students").findOne(
        { Unique_ID: uniqueId },
        { projection: { qr_code: 0 } },
      );

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404, headers: cors },
        );
      }

      return NextResponse.json(
        serializeStudent(student),
        { status: 200, headers: cors },
      );
    }

    let find = db
      .collection<Student>("students")
      .find(query, { projection: { photo_data_url: 0, qr_code: 0 } })
      .sort({ _id: -1 });

    if (limit > 0) {
      find = find.limit(limit);
    }

    const students = await find.toArray();
    return NextResponse.json(
      students.map((student) => serializeStudent(student)),
      { status: 200, headers: cors },
    );
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500, headers: cors },
    );
  }
}

export async function POST(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const body: StudentCreateBody = await req.json();
    const validationError = validateStudentCreationBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const userRole = (normalizeRole(token.role) ?? "Super Admin") as UserRole;
    const userEmail = String(token.email || "").trim();
    const lockKey = `lock:student:${body.Unique_ID}`;

    return withLock(
      lockKey,
      async () => {
        const existingStudent = await db.collection("students").findOne({
          Unique_ID: body.Unique_ID,
        });
        if (existingStudent) {
          return NextResponse.json(
            { error: "A student with this Unique ID already exists." },
            { status: 409 },
          );
        }
        const isNewStudent = true;

        const authorization = await ensureStudentCreationAllowed({
          db,
          body,
          userRole,
          userEmail,
          isNewStudent,
        });

        if (!authorization.ok) {
          return NextResponse.json(
            { error: authorization.error, ...(authorization.code ? { code: authorization.code } : {}) },
            { status: authorization.status },
          );
        }

        const payload = await prepareStudentInsertPayload(body);
        const result = await db.collection("students").insertOne(payload as Student);

        logAudit({
          action: "create",
          collection: "students",
          documentId: result.insertedId.toString(),
          userId: userEmail || "unknown",
          userEmail: userEmail || "unknown",
          userRole,
          summary: `Created student ${body.Unique_ID} (${body.First_Name} ${body.Father_Name})`,
        });

        // Ensure student has an initial active enrollment linked to class session
        try {
          const { createEnrollment } = await import("@/lib/enrollmentService");
          await createEnrollment(
            {
              studentId: result.insertedId,
              academicYear: String(body.Academic_Year),
              classification: body.Classification || "Regular",
              grade: body.Grade,
              classSessionId: body.classSessionId,
              classSessionName: body.classSessionName,
              status: "active",
              isCurrent: true,
            },
            db,
          );
        } catch (enrErr) {
          // Compensating cleanup (NOT a distributed multi-doc transaction):
          // Rollback ONLY the newly inserted student record to prevent un-enrolled orphan.
          const newlyInsertedId = result.insertedId;
          const enrErrorMessage = (enrErr as Error)?.message || "Unknown enrollment error";
          let cleanupSucceeded = false;
          let cleanupError: Error | null = null;
          let deleteResult: { deletedCount?: number } | null = null;

          try {
            if (typeof db.collection("students").deleteOne === "function") {
              deleteResult = await db.collection("students").deleteOne({ _id: newlyInsertedId });
              cleanupSucceeded = deleteResult?.deletedCount === 1;
            }
          } catch (delErr) {
            cleanupError = delErr instanceof Error ? delErr : new Error(String(delErr));
            cleanupSucceeded = false;
          }

          if (cleanupSucceeded) {
            logAudit({
              action: "delete",
              collection: "students",
              documentId: newlyInsertedId.toString(),
              userId: userEmail || "unknown",
              userEmail: userEmail || "unknown",
              userRole,
              summary: `Compensating cleanup: successfully rolled back student ${body.Unique_ID} (${newlyInsertedId.toString()}) after initial enrollment failure: ${enrErrorMessage}`,
            });
            console.error("Initial enrollment failed during student registration; rolled back student:", enrErr);
            return NextResponse.json(
              {
                error: "Failed to create initial enrollment. Student registration was rolled back.",
                cleanupConfirmed: true,
              },
              { status: 500 },
            );
          } else {
            const failureDetail = cleanupError
              ? cleanupError.message
              : `deletedCount was ${deleteResult?.deletedCount ?? 0} (expected 1)`;
            logAudit({
              action: "delete",
              collection: "students",
              documentId: newlyInsertedId.toString(),
              userId: userEmail || "unknown",
              userEmail: userEmail || "unknown",
              userRole,
              summary: `CLEANUP_FAILED: Initial enrollment failed for student ${body.Unique_ID} (${newlyInsertedId.toString()}) and compensating rollback could not be confirmed: ${failureDetail}. Enrollment error: ${enrErrorMessage}`,
            });
            console.error(
              `CRITICAL: Initial enrollment failed and compensating rollback failed for student ${body.Unique_ID}:`,
              {
                enrollmentError: enrErr,
                cleanupError,
                deleteResult,
              },
            );
            return NextResponse.json(
              {
                error: "Failed to create initial enrollment and compensating student cleanup could not be confirmed. Please contact a system administrator.",
                cleanupConfirmed: false,
              },
              { status: 500 },
            );
          }
        }

        createNotification({
          type: "student_created",
          title: "New Student Enrolled",
          message: `${body.First_Name} ${body.Father_Name} (${body.Unique_ID}) enrolled in ${body.Grade}.`,
          targetRoles: ["Super Admin", "HR Admin"],
          href: `/super-admin/students/${result.insertedId.toString()}`,
        });

        return NextResponse.json(
          { _id: result.insertedId.toString() },
          { status: 201 },
        );
      },
      { ttlMs: 15_000, waitMs: 10_000 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { token, error } = await requireWriteAccess(req);
  if (error) return error;

  try {
    const db = await getDb();
    const { id } = await req.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid ID is required" },
        { status: 400 },
      );
    }

    const student = await db.collection<Student>("students").findOne({
      _id: new ObjectId(id),
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // ARCHITECTURAL RULE: Do not delete students. Treat records as permanent institutional history.
    const { getTodayEthiopianDateISO } = await import("@/lib/utils");
    const todayEth = getTodayEthiopianDateISO();

    await db.collection<Student>("students").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "archived",
          statusReason: "Archived via student management (permanent institutional record preserved)",
          statusEffectiveDate: todayEth,
          statusChangedBy: String(token.email || token.id || "admin"),
          statusChangedByRole: String(token.role || "Admin"),
          statusUpdatedAt: new Date(),
        },
      },
    );

    // Also close any active enrollment
    await db.collection("enrollments").updateMany(
      { studentId: new ObjectId(id), status: "active" },
      { $set: { status: "withdrawn", endDate: new Date(), updatedAt: new Date() } },
    );

    logAudit({
      action: "update",
      collection: "students",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Archived student ${student?.Unique_ID || id} (${student?.First_Name || "?"} ${student?.Father_Name || "?"}) — institutional history preserved`,
    });

    return NextResponse.json(
      { message: "Student archived. Institutional history preserved.", archived: true },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500 },
    );
  }
}
