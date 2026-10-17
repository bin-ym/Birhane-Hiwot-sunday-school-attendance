import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import { BUILT_IN_ROLES } from "@/lib/rbac";
import { RoleDocument, User } from "@/lib/models";
import { logAudit } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const db = await getDb();
    const users = await db
      .collection<User>("users")
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      {
        users: users.map((u) => ({
          _id: u._id?.toString(),
          name: u.name || "",
          email: u.email,
          role: u.role,
          grade: u.grade,
          canAddStudent: u.canAddStudent,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { userId, role, grade, canAddStudent } = body;

    if (!userId || typeof userId !== "string" || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (!role || typeof role !== "string") {
      return NextResponse.json({ error: "Missing required role" }, { status: 400 });
    }

    const trimmedRole = role.trim();
    const db = await getDb();

    // 1. Verify target user exists
    const targetUser = await db.collection<User>("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Verify assigned role is either a valid built-in role or an active custom role
    const isBuiltIn = BUILT_IN_ROLES.some(
      (br) => br.toLowerCase() === trimmedRole.toLowerCase()
    );
    if (!isBuiltIn) {
      const customRole = await db.collection<RoleDocument>("roles").findOne({
        name: { $regex: new RegExp(`^${trimmedRole}$`, "i") },
        isActive: true,
      });
      if (!customRole) {
        return NextResponse.json(
          { error: `Role '${trimmedRole}' does not exist or is disabled` },
          { status: 400 }
        );
      }
    }

    // 3. Safety constraint: Prevent removing or demoting the last active Super Admin
    if (targetUser.role === "Super Admin" && trimmedRole !== "Super Admin") {
      const superAdminCount = await db.collection("users").countDocuments({
        role: "Super Admin",
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot change role: this is the only active Super Admin account. Create another Super Admin before changing this account's role.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Perform update
    const updatePayload: Record<string, unknown> = {
      role: trimmedRole,
      updatedAt: new Date().toISOString(),
    };

    if (grade !== undefined) {
      updatePayload.grade = grade;
    }
    if (canAddStudent !== undefined) {
      updatePayload.canAddStudent = Boolean(canAddStudent);
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updatePayload }
    );

    // 5. Audit log
    logAudit({
      action: "update",
      collection: "users",
      documentId: userId,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Changed role of ${targetUser.email} from '${targetUser.role}' to '${trimmedRole}'`,
      changedFields: Object.keys(updatePayload),
    });

    return NextResponse.json(
      {
        message: `User role updated to '${trimmedRole}' successfully`,
        user: {
          _id: userId,
          email: targetUser.email,
          name: targetUser.name,
          role: trimmedRole,
          grade: updatePayload.grade ?? targetUser.grade,
          canAddStudent: updatePayload.canAddStudent ?? targetUser.canAddStudent,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
