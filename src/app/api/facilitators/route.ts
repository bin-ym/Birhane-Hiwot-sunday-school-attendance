// src/app/api/facilitators/route.ts

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { UserRole } from "@/lib/models";
import { getToken } from "next-auth/jwt";

const ROLE_VALUES: { value: UserRole; label: string }[] = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
  { value: "Education Facilitator", label: "Education Facilitator" },
];

const FULL_ACCESS_ADMIN_ROLES = ["Admin", "Super Admin"];
const HR_ADMIN_ROLE = "HR Admin";
const EDUCATION_ADMIN_ROLE = "Education Admin";
const ATTENDANCE_FACILITATOR_ROLE = "Attendance Facilitator";
const EDUCATION_FACILITATOR_ROLE = "Education Facilitator";

async function getRequesterRole(req: NextRequest): Promise<string> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return String(token?.role || "");
}

function canManageFacilitators(role: string): boolean {
  return (
    FULL_ACCESS_ADMIN_ROLES.includes(role) ||
    role === HR_ADMIN_ROLE ||
    role === EDUCATION_ADMIN_ROLE ||
    role === ATTENDANCE_FACILITATOR_ROLE ||
    role === EDUCATION_FACILITATOR_ROLE
  );
}

function getManageableFacilitatorRoles(role: string): string[] {
  if (FULL_ACCESS_ADMIN_ROLES.includes(role)) {
    return [ATTENDANCE_FACILITATOR_ROLE, EDUCATION_FACILITATOR_ROLE];
  }
  if (role === HR_ADMIN_ROLE || role === ATTENDANCE_FACILITATOR_ROLE) {
    return [ATTENDANCE_FACILITATOR_ROLE];
  }
  if (role === EDUCATION_ADMIN_ROLE || role === EDUCATION_FACILITATOR_ROLE) {
    return [EDUCATION_FACILITATOR_ROLE];
  }
  return [];
}

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/roles")) {
    return NextResponse.json(ROLE_VALUES, { status: 200 });
  }

  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: "Invalid facilitator ID" },
          { status: 400 },
        );
      }

      const facilitator = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(id), role: { $in: allowedRoles } },
          { projection: { password: 0 } },
        );

      if (!facilitator) {
        return NextResponse.json(
          { error: "Facilitator not found" },
          { status: 404 },
        );
      }

      const result: any = {
        ...facilitator,
        _id: facilitator._id.toString(),
      };

      if (facilitator.role !== "Attendance Facilitator") {
        delete result.grade;
      }

      return NextResponse.json(result, { status: 200 });
    }

    const facilitators = await db
      .collection("users")
      .find({ role: { $in: allowedRoles } })
      .project({ password: 0 })
      .toArray();

    const transformed = facilitators.map((fac) => {
      const f: any = {
        ...fac,
        _id: fac._id.toString(),
      };

      if (fac.role !== "Attendance Facilitator") {
        delete f.grade;
      }

      return f;
    });

    return NextResponse.json(transformed, { status: 200 });
  } catch (error) {
    console.error("Facilitator GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilitators" },
      { status: 500 },
    );
  }
}

/* ===================== POST ===================== */
export async function POST(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { name, email, password, role, grade } = await req.json();
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 },
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "No permission for this role" },
        { status: 403 },
      );
    }

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser: any = {
      name,
      email,
      password: hashed,
      role,
      createdAt: new Date().toISOString(),
    };

    if (role === "Attendance Facilitator") {
      if (!grade || (Array.isArray(grade) && grade.length === 0)) {
        return NextResponse.json(
          { error: "Grade is required" },
          { status: 400 },
        );
      }
      newUser.grade = grade;
    }

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role,
        ...(role === "Attendance Facilitator" ? { grade } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Facilitator POST error:", error);
    return NextResponse.json(
      { error: "Failed to create facilitator" },
      { status: 500 },
    );
  }
}

/* ===================== PUT ===================== */
export async function PUT(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id, name, email, password, role, grade } = await req.json();
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);

    if (!id || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 },
      );
    }

    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 },
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "No permission for this role" },
        { status: 403 },
      );
    }

    const update: any = { name, email, role };

    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    if (role === "Attendance Facilitator") {
      if (!grade || (Array.isArray(grade) && grade.length === 0)) {
        return NextResponse.json(
          { error: "Grade is required" },
          { status: 400 },
        );
      }
      update.grade = grade;
    } else {
      await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(id) },
          { $unset: { grade: "" } },
        );
    }

    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id), role: { $in: allowedRoles } },
        { $set: update },
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update facilitator" },
      { status: 500 },
    );
  }
}

/* ===================== DELETE ===================== */
export async function DELETE(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await req.json();
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 },
      );
    }

    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
      role: { $in: allowedRoles },
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete facilitator" },
      { status: 500 },
    );
  }
}