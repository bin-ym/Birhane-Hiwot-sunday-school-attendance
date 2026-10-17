import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { canAccess, normalizeRole } from "@/lib/rbac";
import { ScheduleSession, ScheduleStatus } from "@/lib/models";
import { logAudit } from "@/lib/auditLog";

function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export async function GET(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const role = normalizeRole(token.role);
  if (!role || !canAccess(role, "schedule:view")) {
    return NextResponse.json({ error: "Forbidden: insufficient schedule permissions" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const academicYear = url.searchParams.get("academicYear");
    const semester = url.searchParams.get("semester");
    const department = url.searchParams.get("department");
    const grade = url.searchParams.get("grade");
    const date = url.searchParams.get("date");
    const status = url.searchParams.get("status");

    const query: Record<string, unknown> = {};

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (date) query.date = date;
    if (status) query.status = status;

    // Role-based scoping
    if (role === "Attendance Facilitator" && token.grade) {
      const allowedGrades = Array.isArray(token.grade) ? token.grade : [token.grade];
      if (grade) {
        if (!allowedGrades.includes(grade)) {
          return NextResponse.json([], { status: 200 });
        }
        query.grade = grade;
      } else {
        query.grade = { $in: allowedGrades };
      }
    } else if (grade) {
      query.grade = grade;
    }

    if (role === "Education Admin") {
      query.department = { $in: ["Education", "General", "Sunday School"] };
    } else if (role === "HR Admin") {
      query.department = { $in: ["HR", "General", "Sunday School"] };
    } else if (department) {
      query.department = department;
    }

    const sessions = await db
      .collection<ScheduleSession>("schedules")
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .toArray();

    // Fetch enrolled student count per grade for the current academic year
    const gradeCounts = await db
      .collection("enrollments")
      .aggregate<{ _id: string; count: number }>([
        { $match: { isCurrent: true, status: "active" } },
        { $group: { _id: "$grade", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = new Map<string, number>();
    for (const gc of gradeCounts) {
      if (gc._id) countMap.set(gc._id, gc.count);
    }

    const enrichedSessions = sessions.map((s) => ({
      ...s,
      _id: s._id?.toString(),
      enrolledStudentsCount: countMap.get(s.grade) || 0,
    }));

    return NextResponse.json({ schedules: enrichedSessions }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const role = normalizeRole(token.role);
  if (!role || !canAccess(role, "schedule:write")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to create schedules" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      academicYear,
      semester,
      department,
      grade,
      section,
      date,
      sundayNumber,
      sundayName,
      startTime,
      endTime,
      status,
      topic,
      assignedTeacherId,
      assignedTeacherName,
      notes,
    } = body;

    if (!academicYear || !semester || !grade || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: academicYear, semester, grade, date, startTime, endTime" },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "Session start time must be before end time" },
        { status: 400 }
      );
    }

    // Department boundary enforcement
    const resolvedDepartment = department || "Sunday School";
    if (role === "Education Admin" && resolvedDepartment !== "Education") {
      return NextResponse.json(
        { error: "Education Admins can only create schedules for the Education department" },
        { status: 403 }
      );
    }
    if (role === "HR Admin" && resolvedDepartment !== "HR") {
      return NextResponse.json(
        { error: "HR Admins can only create schedules for the HR department" },
        { status: 403 }
      );
    }

    const db = await getDb();

    // 1. Duplicate session check: exact same grade, section, date, non-cancelled
    const existingSessionsOnDate = await db
      .collection<ScheduleSession>("schedules")
      .find({
        date,
        grade,
        status: { $ne: "cancelled" },
        ...(section ? { section } : {}),
      })
      .toArray();

    if (existingSessionsOnDate.length > 0) {
      // Check for overlapping time slot
      for (const existing of existingSessionsOnDate) {
        if (timesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
          return NextResponse.json(
            {
              error: `Schedule conflict: ${grade} already has a session on ${date} (${existing.startTime} - ${existing.endTime}) overlapping with this time slot.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const newSession: ScheduleSession = {
      academicYear: String(academicYear).trim(),
      semester: String(semester).trim(),
      department: resolvedDepartment,
      grade: String(grade).trim(),
      section: section ? String(section).trim() : undefined,
      date: String(date).trim(),
      sundayNumber: sundayNumber ? Number(sundayNumber) : undefined,
      sundayName: sundayName ? String(sundayName).trim() : undefined,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      status: (status as ScheduleStatus) || "scheduled",
      topic: topic ? String(topic).trim() : undefined,
      assignedTeacherId: assignedTeacherId ? String(assignedTeacherId) : undefined,
      assignedTeacherName: assignedTeacherName ? String(assignedTeacherName).trim() : undefined,
      assignedSchedulerId: String(token.id || ""),
      assignedSchedulerName: String(token.name || token.email || ""),
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("schedules").insertOne(newSession);

    logAudit({
      action: "create",
      collection: "schedules",
      documentId: result.insertedId.toString(),
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Created schedule session for ${grade} on ${date} (${startTime}-${endTime}) in ${resolvedDepartment}`,
    });

    return NextResponse.json(
      {
        message: "Schedule session created successfully",
        schedule: { ...newSession, _id: result.insertedId.toString() },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const role = normalizeRole(token.role);
  if (!role || !canAccess(role, "schedule:write")) {
    return NextResponse.json({ error: "Forbidden: insufficient schedule permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection<ScheduleSession>("schedules").findOne({
      _id: new ObjectId(id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule session not found" }, { status: 404 });
    }

    // Department boundary check
    if (role === "Education Admin" && existing.department !== "Education") {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify schedules outside the Education department" },
        { status: 403 }
      );
    }
    if (role === "HR Admin" && existing.department !== "HR") {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify schedules outside the HR department" },
        { status: 403 }
      );
    }

    const targetDate = updates.date || existing.date;
    const targetGrade = updates.grade || existing.grade;
    const targetStart = updates.startTime || existing.startTime;
    const targetEnd = updates.endTime || existing.endTime;

    if (targetStart >= targetEnd) {
      return NextResponse.json(
        { error: "Session start time must be before end time" },
        { status: 400 }
      );
    }

    // Check time overlap if date, grade, or time changed
    if (
      (updates.date && updates.date !== existing.date) ||
      (updates.grade && updates.grade !== existing.grade) ||
      (updates.startTime && updates.startTime !== existing.startTime) ||
      (updates.endTime && updates.endTime !== existing.endTime)
    ) {
      const otherSessions = await db
        .collection<ScheduleSession>("schedules")
        .find({
          _id: { $ne: new ObjectId(id) },
          date: targetDate,
          grade: targetGrade,
          status: { $ne: "cancelled" },
        })
        .toArray();

      for (const other of otherSessions) {
        if (timesOverlap(targetStart, targetEnd, other.startTime, other.endTime)) {
          return NextResponse.json(
            {
              error: `Schedule conflict: ${targetGrade} already has a session on ${targetDate} (${other.startTime} - ${other.endTime}) overlapping with this time slot.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const setPayload: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    delete setPayload._id;

    await db.collection("schedules").updateOne(
      { _id: new ObjectId(id) },
      { $set: setPayload }
    );

    logAudit({
      action: "update",
      collection: "schedules",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Updated schedule session for ${targetGrade} on ${targetDate} (${Object.keys(updates).join(", ")})`,
    });

    return NextResponse.json({ message: "Schedule session updated successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const role = normalizeRole(token.role);
  if (!role || !canAccess(role, "schedule:write")) {
    return NextResponse.json({ error: "Forbidden: insufficient schedule permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection<ScheduleSession>("schedules").findOne({
      _id: new ObjectId(id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule session not found" }, { status: 404 });
    }

    // Department boundary check
    if (role === "Education Admin" && existing.department !== "Education") {
      return NextResponse.json(
        { error: "Forbidden: You cannot delete schedules outside the Education department" },
        { status: 403 }
      );
    }
    if (role === "HR Admin" && existing.department !== "HR") {
      return NextResponse.json(
        { error: "Forbidden: You cannot delete schedules outside the HR department" },
        { status: 403 }
      );
    }

    await db.collection("schedules").deleteOne({ _id: new ObjectId(id) });

    logAudit({
      action: "delete",
      collection: "schedules",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Deleted schedule session for ${existing.grade} on ${existing.date} (${existing.department})`,
    });

    return NextResponse.json({ message: "Schedule session deleted successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
