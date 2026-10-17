// src/app/api/class-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getClassSessions,
  createClassSession,
  updateClassSession,
  deleteClassSession,
  serializeClassSession,
} from "@/lib/classSessionService";
import { requireAuth, requirePermission, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import type { StudentClassification } from "@/lib/models";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || undefined;
    const grade = searchParams.get("grade") || undefined;
    const classification = (searchParams.get("classification") as StudentClassification) || undefined;
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const includeEnrolledCount =
      searchParams.get("includeStats") === "true" ||
      searchParams.get("includeEnrolledCount") === "true";

    const sessions = await getClassSessions({
      academicYear,
      grade,
      classification,
      activeOnly,
      includeEnrolledCount,
    });

    return NextResponse.json(sessions.map(serializeClassSession), { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { token, error } = await requirePermission(req, "schedule:write");
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    if (!body.academicYear || !body.name || !body.nameAmharic || !body.dayOfWeek || !body.session) {
      return NextResponse.json(
        { error: "academicYear, name, nameAmharic, dayOfWeek, and session are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.grades) || body.grades.length === 0) {
      return NextResponse.json({ error: "At least one grade must be assigned to the class session" }, { status: 400 });
    }

    const created = await createClassSession(
      {
        academicYear: String(body.academicYear).trim(),
        name: String(body.name).trim(),
        nameAmharic: String(body.nameAmharic).trim(),
        dayOfWeek: body.dayOfWeek,
        session: body.session,
        startTime: body.startTime,
        endTime: body.endTime,
        grades: body.grades,
        classification: body.classification || "Regular",
        description: body.description,
        capacity: body.capacity,
        isActive: body.isActive ?? true,
      },
      {
        id: String(token.id || token.sub || ""),
        email: String(token.email || ""),
        role: String(token.role || ""),
      },
    );

    return NextResponse.json(serializeClassSession(created), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { token, error } = await requirePermission(req, "schedule:write");
  if (error) return error;

  try {
    const body = await req.json();
    if (!body || !body._id) {
      return NextResponse.json({ error: "_id is required for update" }, { status: 400 });
    }

    const updated = await updateClassSession(
      body._id,
      body,
      {
        id: String(token.id || token.sub || ""),
        email: String(token.email || ""),
        role: String(token.role || ""),
      },
    );

    if (!updated) {
      return NextResponse.json({ error: "Class session not found" }, { status: 404 });
    }

    return NextResponse.json(serializeClassSession(updated), { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { token, error } = await requirePermission(req, "schedule:write");
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    const deleted = await deleteClassSession(
      id,
      {
        id: String(token.id || token.sub || ""),
        email: String(token.email || ""),
        role: String(token.role || ""),
      },
    );

    if (!deleted) {
      return NextResponse.json({ error: "Class session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
