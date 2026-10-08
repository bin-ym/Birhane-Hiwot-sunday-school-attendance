import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import {
  updateStudentLifecycleStatus,
  StudentLifecycleError,
} from "@/lib/studentLifecycleService";
import type { StudentLifecycleStatus } from "@/lib/models";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const { error } = await requireAuth(req);
  if (error) {
    Object.entries(cors).forEach(([k, v]) => error.headers.set(k, v));
    return error;
  }

  try {
    const { studentId } = await params;
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400, headers: cors },
      );
    }

    const db = await getDb();
    const studentQuery = ObjectId.isValid(studentId)
      ? { _id: new ObjectId(studentId) }
      : { Unique_ID: studentId };

    const student = await db.collection("students").findOne(studentQuery);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404, headers: cors },
      );
    }

    return NextResponse.json(
      {
        studentId: student._id.toString(),
        uniqueId: student.Unique_ID,
        status: student.status || "active",
        statusEffectiveDate: student.statusEffectiveDate || null,
        statusReason: student.statusReason || null,
        completionDate: student.completionDate || null,
        statusChangedBy: student.statusChangedBy || null,
        statusChangedByRole: student.statusChangedByRole || null,
        statusUpdatedAt: student.statusUpdatedAt || null,
      },
      { status: 200, headers: cors },
    );
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500, headers: cors },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const { token, error } = await requireAuth(req);
  if (error) {
    Object.entries(cors).forEach(([k, v]) => error.headers.set(k, v));
    return error;
  }

  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) {
    Object.entries(cors).forEach(([k, v]) => rl.headers.set(k, v));
    return rl;
  }

  try {
    const { studentId } = await params;
    const body = await req.json();

    const action = body.action || body.status;
    let newStatus: StudentLifecycleStatus = "active";

    if (action === "withdraw" || action === "withdrawn" || action === "dropped") {
      newStatus = "withdrawn";
    } else if (action === "complete" || action === "completed") {
      newStatus = "completed";
    } else if (action === "deactivate" || action === "inactive") {
      newStatus = "inactive";
    } else if (action === "reactivate" || action === "active") {
      newStatus = "active";
    } else if (action === "archive" || action === "archived") {
      newStatus = "archived";
    } else {
      return NextResponse.json(
        { error: `Invalid lifecycle action or status: ${String(action)}` },
        { status: 400, headers: cors },
      );
    }

    const effectiveDate = body.effectiveDate || body.effectiveDateISO;
    const reason = body.reason;
    const classSessionId = body.classSessionId;
    const grade = body.grade;

    const user = {
      id: String(token.id || token.sub || ""),
      email: String(token.email || ""),
      role: String(token.role || ""),
    };

    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus,
      effectiveDate,
      reason,
      user,
      classSessionId,
      grade,
    });

    return NextResponse.json(
      {
        message: `Student status successfully updated to ${newStatus}`,
        student: {
          ...result.student,
          _id: result.student._id.toString(),
        },
        updatedEnrollment: result.updatedEnrollment
          ? {
              ...result.updatedEnrollment,
              _id: result.updatedEnrollment._id?.toString(),
            }
          : undefined,
        newEnrollment: result.newEnrollment
          ? {
              ...result.newEnrollment,
              _id: result.newEnrollment._id?.toString(),
            }
          : undefined,
      },
      { status: 200, headers: cors },
    );
  } catch (err: unknown) {
    if (err instanceof StudentLifecycleError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status, headers: cors },
      );
    }

    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500, headers: cors },
    );
  }
}
