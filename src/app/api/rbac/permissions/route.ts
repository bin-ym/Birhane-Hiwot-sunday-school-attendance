import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  ROLE_PERMISSIONS,
  CURRENT_ROLE_VALUES,
  Permission,
} from "@/lib/rbac";
import {
  getCachedRBACOverrides,
  invalidateRBACOverridesCache,
} from "@/lib/rbacServer";
import { requireAuth, requireRole } from "@/lib/apiAuth";
import { logAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/rbac/permissions
 * Retrieves configured RBAC overrides, default base permissions, and roles.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const overrides = await getCachedRBACOverrides();

    return NextResponse.json({
      success: true,
      roles: CURRENT_ROLE_VALUES,
      basePermissions: ROLE_PERMISSIONS,
      overrides,
    });
  } catch (error) {
    console.error("Failed to load RBAC permissions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load permissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rbac/permissions
 * Saves updated RBAC permission overrides. Restricted exclusively to Super Admin.
 */
export async function POST(req: NextRequest) {
  const { token, error } = await requireRole(req, "Super Admin");
  if (error) return error;

  try {
    const body = await req.json();
    const rawOverrides = body.overrides;

    if (!rawOverrides || typeof rawOverrides !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid overrides payload" },
        { status: 400 }
      );
    }

    // Sanitize overrides:
    // 1. Super Admin cannot have ANY permissions denied (permanent protection).
    // 2. Validate role:permission format.
    const sanitizedOverrides: Record<string, boolean> = {};

    for (const [key, val] of Object.entries(rawOverrides)) {
      if (typeof val !== "boolean") continue;

      const [roleStr, permStr] = key.split(":");
      if (!roleStr || !permStr) continue;

      // Super Admin protection: Disallow modifying Super Admin permissions
      if (roleStr.toLowerCase() === "super admin") {
        continue;
      }

      sanitizedOverrides[key] = val;
    }

    const db = await getDb();
    const collection = db.collection("rbac_permissions");

    const previousDoc = await collection.findOne({ _id: "configured_overrides" as any });
    const previousOverrides = previousDoc?.overrides || {};

    await collection.updateOne(
      { _id: "configured_overrides" as any },
      {
        $set: {
          overrides: sanitizedOverrides,
          updatedAt: new Date(),
          updatedBy: (token.email as string) || (token.username as string) || "Super Admin",
        },
      },
      { upsert: true }
    );

    invalidateRBACOverridesCache();

    // Audit log the permission update
    try {
      await logAudit({
        action: "update",
        collection: "rbac_permissions",
        documentId: "configured_overrides",
        userId: (token.sub as string) || (token.email as string) || "super-admin",
        userEmail: (token.email as string) || "admin@birhanehiwot.org",
        userRole: (token.role as string) || "Super Admin",
        summary: `Updated RBAC permission overrides (${Object.keys(sanitizedOverrides).length} rules configured)`,
        changedFields: Object.keys(sanitizedOverrides),
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log for RBAC changes:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Permissions saved successfully",
      overrides: sanitizedOverrides,
    });
  } catch (error) {
    console.error("Failed to save RBAC permissions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save permissions" },
      { status: 500 }
    );
  }
}
