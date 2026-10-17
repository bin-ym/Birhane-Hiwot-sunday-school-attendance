import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { getCurrentEnrollment, EnrollmentServiceError } from "@/lib/enrollmentService";
import { serializeEnrollment } from "../lib";

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

    const enrollment = await getCurrentEnrollment(studentId);
    if (!enrollment) {
      return NextResponse.json({ error: "Current enrollment not found" }, { status: 404 });
    }

    return NextResponse.json(serializeEnrollment(enrollment), { status: 200 });
  } catch (err) {
    if (err instanceof EnrollmentServiceError && err.code === "INVALID_INPUT") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
