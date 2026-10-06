import type { UserRole } from "@/lib/models";

export const CURRENT_ROLE_VALUES: UserRole[] = [
  "Super Admin",
  "HR Admin",
  "Education Admin",
  "Attendance Facilitator",
  "Education Facilitator",
  "Schedule Manager",
  "Teacher",
];

export const ROLE_ALIASES: Record<string, UserRole> = {
  "HR Facilitator": "Attendance Facilitator",
  "Attendance Facilitator": "Attendance Facilitator",
  "Educational Facilitator": "Education Facilitator",
  "Education Facilitator": "Education Facilitator",
  "Schedule Manager": "Schedule Manager",
};

export function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") {
    return null;
  }

  const trimmed = role.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = CURRENT_ROLE_VALUES.find(
    (value) => value.toLowerCase() === trimmed.toLowerCase(),
  );

  if (directMatch) {
    return directMatch;
  }

  const alias = Object.entries(ROLE_ALIASES).find(
    ([aliasName]) => aliasName.toLowerCase() === trimmed.toLowerCase(),
  );

  return alias ? alias[1] : null;
}

export function hasAnyRole(
  role: unknown,
  allowedRoles: readonly UserRole[],
): boolean {
  const normalized = normalizeRole(role);
  return Boolean(normalized && allowedRoles.includes(normalized));
}

export function isSuperAdmin(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin"]);
}

export function isAdminRole(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "HR Admin", "Education Admin"]);
}

export function canCreateStudents(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "HR Admin", "Attendance Facilitator"]);
}

export function canManagePayments(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "HR Admin", "Attendance Facilitator"]);
}

export function canManageEnrollment(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "Education Admin"]);
}

export function canManageResults(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "Education Admin", "Education Facilitator"]);
}

export function canManageSchedules(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "Schedule Manager"]);
}

export type Permission =
  | "student:create"
  | "payment:write"
  | "enrollment:write"
  | "results:write"
  | "schedule:write"
  | "facilitator:manage"
  | "department-admin:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Record<Permission, readonly UserRole[]> = {
  "student:create": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "payment:write": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "enrollment:write": ["Super Admin", "Education Admin"],
  "results:write": ["Super Admin", "Education Admin", "Education Facilitator"],
  "schedule:write": ["Super Admin", "Schedule Manager"],
  "facilitator:manage": ["Super Admin", "HR Admin", "Education Admin"],
  "department-admin:manage": ["Super Admin"],
  "audit:read": ["Super Admin"],
};

export function canAccess(role: unknown, permission: Permission): boolean {
  return hasAnyRole(role, ROLE_PERMISSIONS[permission]);
}

export function isPathAuthorizedForRole(path: string, role: unknown): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || !path) {
    return false;
  }

  const adminPrefixes = [
    "/admin/facilitators",
    "/admin/reports",
    "/admin/students",
  ];
  const educationPrefixes = [
    "/admin/facilitators",
    "/admin/reports",
  ];

  if (path.startsWith("/super-admin")) {
    return normalizedRole === "Super Admin";
  }

  if (path.startsWith("/admin")) {
    if (!["Super Admin", "HR Admin", "Education Admin", "Attendance Facilitator", "Education Facilitator"].includes(normalizedRole)) {
      return false;
    }

    if (normalizedRole === "HR Admin" || normalizedRole === "Attendance Facilitator") {
      return adminPrefixes.some((prefix) => path.startsWith(prefix));
    }

    if (normalizedRole === "Education Admin" || normalizedRole === "Education Facilitator") {
      return educationPrefixes.some((prefix) => path.startsWith(prefix));
    }

    return true;
  }

  if (path.startsWith("/hr")) {
    return normalizedRole === "HR Admin" || normalizedRole === "Attendance Facilitator";
  }

  if (path.startsWith("/education")) {
    return normalizedRole === "Education Admin";
  }

  if (path.startsWith("/facilitator/attendance")) {
    return normalizedRole === "Attendance Facilitator" || normalizedRole === "HR Admin";
  }

  if (path.startsWith("/facilitator/results") || path.startsWith("/facilitator/dashboard")) {
    return normalizedRole === "Education Facilitator" || normalizedRole === "Education Admin";
  }

  if (path.startsWith("/facilitator")) {
    return [
      "Attendance Facilitator",
      "Education Facilitator",
      "HR Admin",
      "Education Admin",
    ].includes(normalizedRole);
  }

  return true;
}
