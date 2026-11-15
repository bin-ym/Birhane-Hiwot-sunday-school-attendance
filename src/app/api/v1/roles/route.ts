import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import {
  BUILT_IN_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  Permission,
} from "@/lib/rbac";
import { RoleDocument, UserRole } from "@/lib/models";
import { logAudit } from "@/lib/auditLog";

const ALL_VALID_PERMISSION_IDS = new Set<string>(
  PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.id))
);

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const db = await getDb();

    // 1. Fetch custom roles from database
    const dbRoles = await db
      .collection<RoleDocument>("roles")
      .find({})
      .toArray();

    // 2. Fetch user counts per role
    const userCounts = await db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = new Map<string, number>();
    for (const uc of userCounts) {
      if (uc._id) countMap.set(uc._id, uc.count);
    }

    // 3. Assemble built-in roles
    const builtInRoleList = BUILT_IN_ROLES.map((roleName) => {
      const dbOverride = dbRoles.find(
        (r) => r.isBuiltIn && r.name.toLowerCase() === roleName.toLowerCase()
      );
      return {
        _id: dbOverride?._id?.toString() || `builtin-${roleName.toLowerCase().replace(/\s+/g, "-")}`,
        name: roleName,
        description:
          dbOverride?.description ||
          getDefaultRoleDescription(roleName),
        isBuiltIn: true,
        isActive: dbOverride ? dbOverride.isActive : true,
        permissions: (dbOverride?.permissions as Permission[]) || (DEFAULT_ROLE_PERMISSIONS[roleName] || []),
        userCount: countMap.get(roleName) || 0,
        createdAt: dbOverride?.createdAt || null,
        updatedAt: dbOverride?.updatedAt || null,
      };
    });

    // 4. Assemble custom roles
    const customRoleList = dbRoles
      .filter((r) => !r.isBuiltIn)
      .map((r) => ({
        _id: r._id?.toString(),
        name: r.name,
        description: r.description,
        isBuiltIn: false,
        isActive: r.isActive ?? true,
        permissions: r.permissions || [],
        userCount: countMap.get(r.name) || 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

    return NextResponse.json(
      { roles: [...builtInRoleList, ...customRoleList] },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, description, permissions, isActive } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Role name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Check if name collides with built-in roles
    const collidesWithBuiltIn = BUILT_IN_ROLES.some(
      (br) => br.toLowerCase() === trimmedName.toLowerCase()
    );
    if (collidesWithBuiltIn) {
      return NextResponse.json(
        { error: `Cannot create custom role: '${trimmedName}' is a reserved built-in role name` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db.collection("roles").findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A role with name '${trimmedName}' already exists` },
        { status: 409 }
      );
    }

    // Validate permissions array
    const validPermissions: string[] = [];
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        if (typeof p === "string" && ALL_VALID_PERMISSION_IDS.has(p)) {
          validPermissions.push(p);
        }
      }
    }

    const newRole: RoleDocument = {
      name: trimmedName,
      description: typeof description === "string" ? description.trim() : "",
      isBuiltIn: false,
      isActive: isActive !== false,
      permissions: validPermissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("roles").insertOne(newRole);

    logAudit({
      action: "create",
      collection: "roles",
      documentId: result.insertedId.toString(),
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Created custom role '${trimmedName}' with ${validPermissions.length} permissions`,
    });

    return NextResponse.json(
      {
        message: "Role created successfully",
        role: { ...newRole, _id: result.insertedId.toString() },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { id, name, description, permissions, isActive } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing role identifier" }, { status: 400 });
    }

    const db = await getDb();

    // Check if target is a built-in role identifier
    const isBuiltInId = id.startsWith("builtin-");
    let targetBuiltInName: UserRole | null = null;
    if (isBuiltInId) {
      const suffix = id.replace("builtin-", "").toLowerCase();
      const match = BUILT_IN_ROLES.find(
        (r) => r.toLowerCase().replace(/\s+/g, "-") === suffix
      );
      if (match) targetBuiltInName = match;
    }

    // Validate permissions array
    let validPermissions: string[] | undefined = undefined;
    if (Array.isArray(permissions)) {
      validPermissions = [];
      for (const p of permissions) {
        if (typeof p === "string" && ALL_VALID_PERMISSION_IDS.has(p)) {
          validPermissions.push(p);
        }
      }
    }

    if (targetBuiltInName) {
      // Super Admin protection: Cannot revoke core Super Admin admin rights
      if (targetBuiltInName === "Super Admin" && validPermissions) {
        if (!validPermissions.includes("role:manage") || !validPermissions.includes("user:manage")) {
          return NextResponse.json(
            { error: "Cannot strip critical administrative permissions from Super Admin role" },
            { status: 400 }
          );
        }
      }

      // Upsert into roles collection as override
      await db.collection("roles").updateOne(
        { name: targetBuiltInName, isBuiltIn: true },
        {
          $set: {
            name: targetBuiltInName,
            isBuiltIn: true,
            description: typeof description === "string" ? description.trim() : getDefaultRoleDescription(targetBuiltInName),
            isActive: isActive !== false,
            ...(validPermissions ? { permissions: validPermissions } : {}),
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: { createdAt: new Date().toISOString() },
        },
        { upsert: true }
      );

      logAudit({
        action: "update",
        collection: "roles",
        documentId: id,
        userId: String(token.id || ""),
        userEmail: String(token.email || ""),
        userRole: String(token.role || ""),
        summary: `Updated built-in role '${targetBuiltInName}' configuration`,
      });

      return NextResponse.json({ message: "Built-in role configuration updated" }, { status: 200 });
    }

    // Custom role update by ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid role ObjectId" }, { status: 400 });
    }

    const existingRole = await db.collection<RoleDocument>("roles").findOne({
      _id: new ObjectId(id),
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existingRole.isBuiltIn && existingRole.name === "Super Admin" && validPermissions) {
      if (!validPermissions.includes("role:manage") || !validPermissions.includes("user:manage")) {
        return NextResponse.json(
          { error: "Cannot strip critical administrative permissions from Super Admin role" },
          { status: 400 }
        );
      }
    }

    const updateDoc: Partial<RoleDocument> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof description === "string") updateDoc.description = description.trim();
    if (typeof isActive === "boolean") updateDoc.isActive = isActive;
    if (validPermissions) updateDoc.permissions = validPermissions;

    if (typeof name === "string" && name.trim().length >= 2 && !existingRole.isBuiltIn) {
      const trimmedNewName = name.trim();
      const collidesWithBuiltIn = BUILT_IN_ROLES.some(
        (br) => br.toLowerCase() === trimmedNewName.toLowerCase()
      );
      if (collidesWithBuiltIn) {
        return NextResponse.json(
          { error: `Cannot rename to reserved built-in role name '${trimmedNewName}'` },
          { status: 400 }
        );
      }

      const duplicate = await db.collection("roles").findOne({
        name: { $regex: new RegExp(`^${trimmedNewName}$`, "i") },
        _id: { $ne: new ObjectId(id) },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Another role named '${trimmedNewName}' already exists` },
          { status: 409 }
        );
      }
      updateDoc.name = trimmedNewName;
    }

    await db.collection("roles").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    logAudit({
      action: "update",
      collection: "roles",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Updated role '${existingRole.name}' (${Object.keys(updateDoc).join(", ")})`,
    });

    return NextResponse.json({ message: "Role updated successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing role identifier" }, { status: 400 });
    }

    if (id.startsWith("builtin-")) {
      return NextResponse.json(
        { error: "Built-in system roles cannot be deleted" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid role ObjectId" }, { status: 400 });
    }

    const db = await getDb();
    const roleToDelete = await db.collection<RoleDocument>("roles").findOne({
      _id: new ObjectId(id),
    });

    if (!roleToDelete) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (roleToDelete.isBuiltIn) {
      return NextResponse.json(
        { error: "Built-in system roles cannot be deleted" },
        { status: 400 }
      );
    }

    // Safety constraint: Verify no active users are assigned this role
    const activeAssignedUsersCount = await db.collection("users").countDocuments({
      role: roleToDelete.name,
    });

    if (activeAssignedUsersCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role '${roleToDelete.name}': it is currently assigned to ${activeAssignedUsersCount} user(s). Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await db.collection("roles").deleteOne({ _id: new ObjectId(id) });

    logAudit({
      action: "delete",
      collection: "roles",
      documentId: id,
      userId: String(token.id || ""),
      userEmail: String(token.email || ""),
      userRole: String(token.role || ""),
      summary: `Deleted custom role '${roleToDelete.name}'`,
    });

    return NextResponse.json(
      { message: `Role '${roleToDelete.name}' deleted successfully` },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

function getDefaultRoleDescription(role: UserRole): string {
  switch (role) {
    case "Super Admin":
      return "Global system administrator with unrestricted access to all modules, roles, and settings.";
    case "HR Admin":
      return "Human Resources administrator responsible for student registration, payments, and staff.";
    case "Education Admin":
      return "Academic administrator managing classes, curricula, enrollments, and academic evaluations.";
    case "Attendance Facilitator":
      return "Sunday school facilitator taking attendance roll-calls and monitoring student participation.";
    case "Education Facilitator":
      return "Educational facilitator entering test evaluations, exam scores, and academic progress.";
    case "Schedule Manager":
      return "Schedule coordinator setting up Sunday session dates, class times, and academic timelines.";
    case "Teacher":
      return "Sunday school teacher viewing assigned classes and curriculum topics.";
    default:
      return "System role";
  }
}
