import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  transferClassSession,
  EnrollmentServiceError,
} from "@/lib/enrollmentService";
import { requirePermission, sanitizeError } from "@/lib/apiAuth";
import { serializeEnrollment } from "../lib";

export async function POST(req: NextRequest) {
  const { token, error } = await requirePermission(req, "enrollment:write");
  if (error) return error;

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    const {
      studentId,
      currentEnrollmentId,
      targetClassSessionId,
      targetGrade,
      effectiveDate,
      reason,
      allowCapacityOverride,
    } = body;

    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Valid studentId is required" }, { status: 400 });
    }

    if (!targetClassSessionId || !ObjectId.isValid(targetClassSessionId)) {
      return NextResponse.json({ error: "Valid targetClassSessionId is required" }, { status: 400 });
    }

    if (currentEnrollmentId && !ObjectId.isValid(currentEnrollmentId)) {
      return NextResponse.json({ error: "Invalid currentEnrollmentId provided" }, { status: 400 });
    }

    const user = token
      ? {
          id: String(token.id || token.sub || ""),
          email: String(token.email || ""),
          role: String(token.role || ""),
        }
      : undefined;

    const result = await transferClassSession(
      {
        studentId,
        currentEnrollmentId,
        targetClassSessionId,
        targetGrade: targetGrade ? String(targetGrade).trim() : undefined,
        effectiveDate,
        reason: reason ? String(reason).trim() : undefined,
        allowCapacityOverride: Boolean(allowCapacityOverride),
      },
      user,
    );

    return NextResponse.json(
      {
        success: true,
        previousEnrollment: serializeEnrollment(result.previousEnrollment),
        newEnrollment: serializeEnrollment(result.newEnrollment),
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof EnrollmentServiceError) {
      if (err.code === "INVALID_INPUT") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.code === "STUDENT_NOT_FOUND" || err.code === "ENROLLMENT_NOT_FOUND") {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err.code === "CAPACITY_EXCEEDED") {
        return NextResponse.json({ error: err.message, code: "CAPACITY_EXCEEDED" }, { status: 409 });
      }
      if (err.code === "LIFECYCLE_PROTECTED") {
        return NextResponse.json({ error: err.message, code: "LIFECYCLE_PROTECTED" }, { status: 403 });
      }
      if (err.code === "UNAUTHORIZED") {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
