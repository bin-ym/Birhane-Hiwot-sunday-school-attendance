import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const MANAGED_ROLES = ["HR Admin", "Education Admin"] as const;
type ManagedRole = (typeof MANAGED_ROLES)[number];

async function requireSuperAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = String(token?.role || "");

  if (role !== "Super Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

function isManagedRole(role: string): role is ManagedRole {
  return MANAGED_ROLES.includes(role as ManagedRole);
}

export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({ role: { $in: [...MANAGED_ROLES] } })
      .project({ password: 0 })
      .toArray();

    return NextResponse.json(
      users.map((u) => ({ ...u, _id: u._id.toString() })),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load department admins" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  try {
    const { name, email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, role" },
        { status: 400 },
      );
    }
    if (!isManagedRole(role)) {
      return NextResponse.json(
        { error: "Invalid role for department admin" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    const roleExists = await db.collection("users").findOne({ role });
    if (roleExists) {
      return NextResponse.json(
        { error: `${role} account already exists. Edit it instead.` },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashed,
      role,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { _id: result.insertedId.toString(), name, email, role },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create department admin" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  try {
    const { id, name, email, password } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing admin id" }, { status: 400 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
    }

    const db = await getDb();
    const update: Record<string, unknown> = {};

    if (typeof name === "string") update.name = name;
    if (typeof email === "string" && email.trim().length > 0) {
      const existingEmail = await db.collection("users").findOne({
        email: email.trim(),
        _id: { $ne: new ObjectId(id) },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already in use by another account" },
          { status: 409 },
        );
      }
      update.email = email.trim();
    }
    if (typeof password === "string" && password.trim().length > 0) {
      update.password = await bcrypt.hash(password, 10);
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id), role: { $in: [...MANAGED_ROLES] } },
        { $set: { ...update, updatedAt: new Date().toISOString() } },
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Department admin not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Department admin updated" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update department admin" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing admin id" }, { status: 400 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
      role: { $in: [...MANAGED_ROLES] },
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Department admin not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Department admin deleted" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete department admin" },
      { status: 500 },
    );
  }
}
