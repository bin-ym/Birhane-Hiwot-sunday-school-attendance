import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { requireAuth, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";

// Manage permissions for Teachers
const MANAGERIAL_ROLES = ["Super Admin", "Education Admin"];

async function getRequesterInfo(req: NextRequest): Promise<{ role: string; token: Record<string, unknown> } | NextResponse> {
  const { token, error } = await requireAuth(req);
  if (error) return error;
  return { role: String(token.role || ""), token };
}

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
    if (!MANAGERIAL_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: "Invalid teacher ID" },
          { status: 400 },
        );
      }

      const teacher = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(id), role: "Teacher" },
          { projection: { password: 0 } },
        );

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { ...teacher, _id: teacher._id.toString() },
        { status: 200 },
      );
    }

    const teachers = await db
      .collection("users")
      .find({ role: "Teacher" })
      .project({ password: 0 })
      .toArray();

    const transformed = teachers.map((t) => ({
      ...t,
      _id: t._id.toString(),
    }));

    return NextResponse.json(transformed, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

/* ===================== POST ===================== */
export async function POST(req: NextRequest) {
  const rl = await enforceRateLimit(req, { maxRequests: 20, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
    if (!MANAGERIAL_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { name, email, password, grade, assignedSubjects } = await req.json();

    const effectivePassword = password || "Teacher123!";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(effectivePassword, 10);

    const newUser = {
      name,
      email,
      password: hashed,
      role: "Teacher",
      grade: grade || null,
      assignedSubjects: assignedSubjects || [],
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("users").insertOne(newUser);

    logAudit({
      action: "create",
      collection: "users",
      documentId: result.insertedId.toString(),
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: requesterRole,
      summary: `Created Teacher account for ${email}`,
    });

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role: "Teacher",
        grade,
        assignedSubjects,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

/* ===================== PUT ===================== */
export async function PUT(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
    if (!MANAGERIAL_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id, name, email, password, grade, assignedSubjects } =
      await req.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const update: any = {
      name,
      email,
      role: "Teacher",
      grade: grade || null,
      assignedSubjects: assignedSubjects || [],
    };

    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id), role: "Teacher" }, { $set: update });

    if (result.matchedCount === 0) {
      // It might exist but not be a Teacher, or literally not exist.
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    logAudit({
      action: "update",
      collection: "users",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: requesterRole,
      summary: `Updated Teacher ${id}`,
    });

    return NextResponse.json(
      { message: "Updated successfully" },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

/* ===================== DELETE ===================== */
export async function DELETE(req: NextRequest) {
  try {
    const requesterInfo = await getRequesterInfo(req);
    if (requesterInfo instanceof NextResponse) return requesterInfo;
    const { role: requesterRole, token } = requesterInfo;
    if (!MANAGERIAL_ROLES.includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await req.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
      role: "Teacher",
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    logAudit({
      action: "delete",
      collection: "users",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: requesterRole,
      summary: `Deleted Teacher ${id}`,
    });

    return NextResponse.json(
      { message: "Deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
