import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import {
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  BUILT_IN_ROLES,
} from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    return NextResponse.json(
      {
        modules: PERMISSION_MODULES,
        defaultRolePermissions: DEFAULT_ROLE_PERMISSIONS,
        builtInRoles: BUILT_IN_ROLES,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
