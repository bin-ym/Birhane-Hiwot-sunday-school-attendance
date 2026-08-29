import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

const SECRET = process.env.NEXTAUTH_SECRET;

export type UserRole =
  | "Super Admin"
  | "HR Admin"
  | "Education Admin"
  | "Attendance Facilitator"
  | "Education Facilitator"
  | "Teacher";

/**
 * Get the authenticated user's token, or return a 401 response.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<{ token: Record<string, unknown>; error?: NextResponse }> {
  // 1. Try NextAuth session cookie / token
  try {
    const token = await getToken({ req, secret: SECRET });
    if (token) {
      return { token: token as Record<string, unknown> };
    }
  } catch {
    // Continue to Bearer token check
  }

  // 2. Try Mobile Bearer JWT
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ") && SECRET) {
    const rawToken = authHeader.slice(7).trim();
    try {
      const secretBytes = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(rawToken, secretBytes);
      if (payload) {
        return {
          token: {
            ...payload,
            id: payload.sub || payload.id,
            email: payload.email,
            role: payload.role,
            name: payload.name,
            grade: payload.grade,
          },
        };
      }
    } catch {
      return {
        token: {},
        error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }),
      };
    }
  }

  return {
    token: {},
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

/**
 * Require a specific role. Returns error response if not matched.
 */
export async function requireRole(
  req: NextRequest,
  ...allowedRoles: UserRole[]
): Promise<{ token: Record<string, unknown>; error?: NextResponse }> {
  const { token, error } = await requireAuth(req);
  if (error) return { token, error };

  const role = String(token.role || "");
  if (!allowedRoles.includes(role as UserRole)) {
    return {
      token,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { token };
}

/**
 * Require Super Admin role.
 */
export async function requireSuperAdmin(
  req: NextRequest,
): Promise<{ token: Record<string, unknown>; error?: NextResponse }> {
  return requireRole(req, "Super Admin");
}

/**
 * Require any admin role (Super Admin, HR Admin, Education Admin).
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<{ token: Record<string, unknown>; error?: NextResponse }> {
  return requireRole(req, "Super Admin", "HR Admin", "Education Admin");
}

/**
 * Require any authenticated user with a write-capable role.
 */
export async function requireWriteAccess(
  req: NextRequest,
): Promise<{ token: Record<string, unknown>; error?: NextResponse }> {
  return requireRole(
    req,
    "Super Admin",
    "HR Admin",
    "Education Admin",
    "Attendance Facilitator",
    "Education Facilitator",
  );
}

/**
 * Sanitize error messages — never expose internal details to clients.
 */
export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Internal server error";
  // Strip MongoDB connection strings, file paths, and stack details
  return msg
    .replace(/mongodb(\+srv)?:\/\/[^\s"']*/gi, "[redacted]")
    .replace(/[A-Z]:\\[^\s"']*/gi, "[path]")
    .replace(/\/[^\s"']*\.(ts|js|mjs):\d+/gi, "")
    .slice(0, 200);
}
