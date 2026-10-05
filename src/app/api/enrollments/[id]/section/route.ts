import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireRole, sanitizeError } from "@/lib/apiAuth";
import { EnrollmentServiceError, updateEnrollmentSection } from "@/lib/enrollmentService";
import { serializeEnrollment } from "../../lib";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireRole(req, "Super Admin", "HR Admin", "Education Admin");
  if (error) return error;

  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid enrollment ID is required" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body) || !Object.prototype.hasOwnProperty.call(body, "section")) {
      return NextResponse.json({ error: "section is required" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    if (Object.keys(data).some((field) => field !== "section")) {
      return NextResponse.json({ error: "Only section may be updated" }, { status: 400 });
    }

    const section = data.section;
    if (section !== null && typeof section !== "string") {
      return NextResponse.json({ error: "section must be a string or null" }, { status: 400 });
    }

    const enrollment = await updateEnrollmentSection(id, section);
    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    return NextResponse.json(serializeEnrollment(enrollment), { status: 200 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError) {
      if (err.code === "INVALID_INPUT" || err.code === "INVALID_SECTION_UPDATE") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.code === "ENROLLMENT_NOT_FOUND") {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
