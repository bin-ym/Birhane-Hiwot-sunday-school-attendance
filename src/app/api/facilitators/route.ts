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
      // 👇 Return single facilitator by ID
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

      return NextResponse.json(
        {
          ...facilitator,
          _id: facilitator._id.toString(),
        },
        { status: 200 },
      );
    }

    // 👇 Else return all facilitators
    const facilitators = await db
      .collection("users")
      .find({ role: { $in: allowedRoles } })
      .project({ password: 0 })
      .toArray();

    const transformedFacilitators = facilitators.map((fac) => ({
      ...fac,
      _id: fac._id.toString(),
    }));

    return NextResponse.json(transformedFacilitators, { status: 200 });
  } catch (error) {
    console.error("Facilitator GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilitators" },
      { status: 500 },
    );
  }
}

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
        {
          error:
            "Missing required fields: email, password, and role are required",
        },
        { status: 400 },
      );
    }

    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${ROLE_VALUES.map((r) => r.value).join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to create this facilitator role" },
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

    // 👇 Construct full user object with grade
    const newUser: any = {
      name,
      email,
      password: hashed,
      role,
      createdAt: new Date().toISOString(),
    };

    if (role === "Attendance Facilitator") {
      if (!grade) {
        return NextResponse.json(
          { error: "Grade is required for Attendance Facilitators" },
          { status: 400 },
        );
      }
      newUser.grade = grade; // Can be string or string[]
    }

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        email,
        role,
        grade, // 👈 Include in response
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

export async function PUT(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id, name, email, password, role, grade } = await req.json();
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);
    // Validate required fields
    if (!id || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: id, email, and role are required" },
        { status: 400 },
      );
    }
    // Validate role
    if (!ROLE_VALUES.some((r) => r.value === role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${ROLE_VALUES.map((r) => r.value).join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to assign this role" },
        { status: 403 },
      );
    }
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid facilitator ID" },
        { status: 400 },
      );
    }
    const update: {
      name?: string;
      email: string;
      role: string;
      password?: string;
      grade?: string;
    } = { name, email, role };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    if (role === "Attendance Facilitator") {
      if (!grade) {
        return NextResponse.json(
          { error: "Grade is required for Attendance Facilitators" },
          { status: 400 },
        );
      }
      update.grade = grade;
    } else {
      update.grade = undefined; // Clear grade if not Attendance Facilitator
    }
    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id), role: { $in: allowedRoles } },
        { $set: update },
      );
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Facilitator not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { message: "Facilitator updated" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update facilitator" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requesterRole = await getRequesterRole(req);
    if (!canManageFacilitators(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await req.json();
    const allowedRoles = getManageableFacilitatorRoles(requesterRole);
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Missing facilitator ID" },
        { status: 400 },
      );
    }
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid facilitator ID" },
        { status: 400 },
      );
    }
    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
      role: { $in: allowedRoles },
    });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Facilitator not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { message: "Facilitator deleted" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete facilitator" },
      { status: 500 },
    );
  }
}
