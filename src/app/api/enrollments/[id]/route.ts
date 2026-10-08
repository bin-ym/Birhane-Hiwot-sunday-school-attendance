import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth, requirePermission, sanitizeError } from "@/lib/apiAuth";
import {
  getEnrollmentById,
  updateEnrollmentClassSession,
  updateEnrollmentSection,
  EnrollmentServiceError,
} from "@/lib/enrollmentService";
import { serializeEnrollment } from "../lib";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth(_req);
  if (error) return error;

  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid enrollment ID is required" }, { status: 400 });
    }

    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    return NextResponse.json(serializeEnrollment(enrollment), { status: 200 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError && err.code === "INVALID_INPUT") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { token, error } = await requirePermission(req, "enrollment:write");
  if (error) return error;

  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid enrollment ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    let updatedEnrollment = null;

    // 1. Update class session if classSessionId provided
    if (body.classSessionId) {
      if (!ObjectId.isValid(body.classSessionId)) {
        return NextResponse.json({ error: "Valid classSessionId is required" }, { status: 400 });
      }

      const user = token
        ? {
            id: String(token.id || token.sub || ""),
            email: String(token.email || ""),
            role: String(token.role || ""),
          }
        : undefined;

      updatedEnrollment = await updateEnrollmentClassSession(
        id,
        body.classSessionId,
        user,
      );
    }

    // 2. Update section if section provided
    if ("section" in body) {
      updatedEnrollment = await updateEnrollmentSection(id, body.section);
      if (!updatedEnrollment) {
        return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
      }
    }

    if (updatedEnrollment) {
      return NextResponse.json(serializeEnrollment(updatedEnrollment), { status: 200 });
    }

    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError) {
      if (err.code === "INVALID_INPUT") return NextResponse.json({ error: err.message }, { status: 400 });
      if (err.code === "ENROLLMENT_NOT_FOUND") return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
