import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { getEnrollmentById, EnrollmentServiceError } from "@/lib/enrollmentService";
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
