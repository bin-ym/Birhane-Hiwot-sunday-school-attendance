import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  createEnrollment,
  getEnrollmentsByStudent,
  EnrollmentServiceError,
} from "@/lib/enrollmentService";
import { requireAuth, requireRole, requirePermission, sanitizeError } from "@/lib/apiAuth";
import { validateEnrollmentPayload } from "@/lib/validation";
import { isValidClassification, serializeEnrollment, validateSectionInput } from "./lib";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: "Valid studentId is required" }, { status: 400 });
    }

    const enrollments = await getEnrollmentsByStudent(studentId);
    return NextResponse.json(enrollments.map((item) => serializeEnrollment(item)), { status: 200 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError) {
      if (err.code === "INVALID_INPUT") return NextResponse.json({ error: err.message }, { status: 400 });
      if (err.code === "STUDENT_NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, "enrollment:write");
  if (error) return error;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    const validation = validateEnrollmentPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid enrollment payload" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const allowedFields = new Set([
      "studentId",
      "academicYear",
      "classification",
      "grade",
      "gradeNumber",
      "section",
      "classSessionId",
      "classSessionName",
    ]);

    for (const field of Object.keys(data)) {
      if (!allowedFields.has(field)) {
        return NextResponse.json({ error: `Field '${field}' is not allowed` }, { status: 400 });
      }
    }

    if (!ObjectId.isValid(data.studentId as string)) {
      return NextResponse.json({ error: "Valid studentId is required" }, { status: 400 });
    }

    if (!isValidClassification(data.classification)) {
      return NextResponse.json({ error: "classification must be one of: Regular, Extension, SignLanguage, Summer, begena" }, { status: 400 });
    }

    const section = validateSectionInput(data.section);

    const enrollment = await createEnrollment({
      studentId: data.studentId as string,
      academicYear: (data.academicYear as string).trim(),
      classification: data.classification,
      grade: (data.grade as string).trim(),
      gradeNumber: data.gradeNumber as number | undefined,
      section,
      classSessionId: data.classSessionId as string | undefined,
      classSessionName: data.classSessionName as string | undefined,
    });

    return NextResponse.json(serializeEnrollment(enrollment), { status: 201 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError) {
      if (err.code === "INVALID_INPUT") return NextResponse.json({ error: err.message }, { status: 400 });
      if (err.code === "STUDENT_NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
      if (err.code === "DUPLICATE_ACTIVE_ENROLLMENT" || err.code === "UNIQUE_ID_COLLISION") {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
