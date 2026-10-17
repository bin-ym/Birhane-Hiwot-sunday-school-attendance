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
        const isNewStudent = !existingStudent;

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

    const result = await db
      .collection<Student>("students")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    logAudit({
      action: "delete",
      collection: "students",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Deleted student ${student?.Unique_ID || id} (${student?.First_Name || "?"} ${student?.Father_Name || "?"})`,
    });

    return NextResponse.json({ message: "Student deleted" }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500 },
    );
  }
}
