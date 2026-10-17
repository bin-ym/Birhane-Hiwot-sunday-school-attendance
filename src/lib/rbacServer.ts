// src/lib/rbacServer.ts
// Server-side RBAC utilities that interact with MongoDB.
// MUST NOT be imported into client components.

import { getDb } from "@/lib/mongodb";
import { canAccess, normalizeRole, Permission } from "@/lib/rbac";

// In-memory cache for high-frequency server-side authorization checks
let cachedOverrides: Record<string, boolean> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000;

export function invalidateRBACOverridesCache(): void {
  cachedOverrides = null;
  lastCacheTime = 0;
}

export async function getCachedRBACOverrides(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cachedOverrides && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedOverrides;
  }

  try {
    if (!process.env.MONGODB_URI) {
      return cachedOverrides || {};
    }
    const db = await getDb();
    const doc = await db
      .collection("rbac_permissions")
      .findOne({ _id: "configured_overrides" as any });
    cachedOverrides = (doc?.overrides as Record<string, boolean>) || {};
    lastCacheTime = now;
    return cachedOverrides;
  } catch {
    return cachedOverrides || {};
  }
}

/**
 * Asynchronous server-side permission check.
 * Loads configured database overrides (cached) and evaluates effective permission.
 * Super Admin is permanently protected and cannot be denied.
 */
export async function checkPermission(
  role: unknown,
  permission: Permission,
): Promise<boolean> {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  // Super Admin protection rule: Super Admin always retains all permissions
  if (normalizedRole === "Super Admin") {
    return true;
  }

  const overrides = await getCachedRBACOverrides();
  const overrideKey = `${normalizedRole}:${permission}`;
  if (typeof overrides[overrideKey] === "boolean") {
    return overrides[overrideKey];
  }

  return canAccess(normalizedRole, permission);
}
