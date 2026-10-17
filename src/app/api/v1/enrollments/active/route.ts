import { NextRequest, NextResponse } from "next/server";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { getActiveEnrollments } from "@/lib/enrollmentService";
import { serializeEnrollment } from "../lib";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const records = await getActiveEnrollments();
    return NextResponse.json(records.map((item) => serializeEnrollment(item)), { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
