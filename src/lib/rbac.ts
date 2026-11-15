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

export function canWriteStudents(role: unknown): boolean {
  return hasAnyRole(role, ["Super Admin", "HR Admin"]);
}

export type Permission =
  // Students
  | "student:view"
  | "student:create"
  | "student:write"
  | "student:edit"
  | "student:delete"
  // Enrollments
  | "enrollment:view"
  | "enrollment:write"
  | "enrollment:approve"
  // Attendance
  | "attendance:view"
  | "attendance:record"
  | "attendance:export"
  // Scheduling
  | "schedule:view"
  | "schedule:write"
  | "schedule:manage"
  // Subjects
  | "subject:view"
  | "subject:manage"
  // Facilitators / Teachers
  | "facilitator:view"
  | "facilitator:manage"
  // Departments
  | "department:view"
  | "department-admin:manage"
  // Payments
  | "payment:view"
  | "payment:write"
  // Results
  | "results:view"
  | "results:write"
  // Reports
  | "report:view"
  | "report:export"
  // ID Cards & QR
  | "idcard:generate"
  | "qr:verify"
  // Role & User Admin
  | "role:view"
  | "role:manage"
  | "user:manage"
  // System Settings & Audit
  | "audit:read"
  | "settings:manage";

export interface PermissionActionMeta {
  id: Permission;
  action: string;
  description: string;
}

export interface PermissionModuleMeta {
  id: string;
  label: string;
  description: string;
  permissions: PermissionActionMeta[];
}

export const PERMISSION_MODULES: readonly PermissionModuleMeta[] = [
  {
    id: "students",
    label: "Students",
    description: "Student directory, registry records, and detailed profiles",
    permissions: [
      { id: "student:view", action: "View", description: "View student directory and full profiles" },
      { id: "student:create", action: "Create", description: "Register new students in the system" },
      { id: "student:edit", action: "Edit", description: "Update student biographical and demographic data" },
      { id: "student:delete", action: "Delete", description: "Remove or purge student records (Super Admin)" },
    ],
  },
  {
    id: "enrollments",
    label: "Enrollments & Academic Years",
    description: "Yearly student enrollments, sections, and class progression",
    permissions: [
      { id: "enrollment:view", action: "View", description: "Inspect student enrollment statuses" },
      { id: "enrollment:write", action: "Manage", description: "Enroll students, assign sections, and update statuses" },
      { id: "enrollment:approve", action: "Approve", description: "Approve student promotions and transfers" },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Scheduled class sessions, attendance roll-calls, and logs",
    permissions: [
      { id: "attendance:view", action: "View", description: "Access attendance registers and historical records" },
      { id: "attendance:record", action: "Record", description: "Mark student attendance for scheduled sessions" },
      { id: "attendance:export", action: "Export", description: "Export attendance rosters and reports" },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling & Timelines",
    description: "Sunday sessions, semester calendars, and class timelines",
    permissions: [
      { id: "schedule:view", action: "View", description: "View schedule timelines and class rosters" },
      { id: "schedule:write", action: "Create/Edit", description: "Create and update departmental/grade schedules" },
      { id: "schedule:manage", action: "Global Manage", description: "Full schedule control across all departments and academic years" },
    ],
  },
  {
    id: "subjects",
    label: "Subjects & Classes",
    description: "Curriculum topics, subject grouping, and batch mappings",
    permissions: [
      { id: "subject:view", action: "View", description: "Browse subject catalogue and class lists" },
      { id: "subject:manage", action: "Manage", description: "Create, update, and assign subjects" },
    ],
  },
  {
    id: "facilitators",
    label: "Teachers & Facilitators",
    description: "Staff assignments, facilitator roles, and grade scope",
    permissions: [
      { id: "facilitator:view", action: "View", description: "View active teachers and facilitators" },
      { id: "facilitator:manage", action: "Manage", description: "Create, modify, and assign teachers and facilitators" },
    ],
  },
  {
    id: "departments",
    label: "Departments",
    description: "Departmental boundaries and administrator management",
    permissions: [
      { id: "department:view", action: "View", description: "View department structures and assigned administrators" },
      { id: "department-admin:manage", action: "Manage", description: "Manage department administrators and scopes" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    description: "Monthly Sunday school dues, fee recording, and statuses",
    permissions: [
      { id: "payment:view", action: "View", description: "View student payment records and monthly ledger" },
      { id: "payment:write", action: "Manage", description: "Record and modify monthly payment records" },
    ],
  },
  {
    id: "results",
    label: "Student Results",
    description: "Quarterly exams, assignments, test evaluations, and scores",
    permissions: [
      { id: "results:view", action: "View", description: "View academic test evaluations and grades" },
      { id: "results:write", action: "Manage", description: "Input and update student assessment scores" },
    ],
  },
  {
    id: "reports",
    label: "Reports & Exports",
    description: "Official Sunday school reports, Excel workbooks, and analytics",
    permissions: [
      { id: "report:view", action: "View", description: "Access analytics dashboards and statistical reports" },
      { id: "report:export", action: "Export", description: "Export formal attendance and grade Excel workbooks" },
    ],
  },
  {
    id: "idcards",
    label: "Student ID Cards & QR",
    description: "Student identity cards, QR token generation, and scanner verification",
    permissions: [
      { id: "idcard:generate", action: "Generate", description: "Generate and print official student ID cards" },
      { id: "qr:verify", action: "Verify", description: "Scan and authenticate QR tokens for students" },
    ],
  },
  {
    id: "administration",
    label: "User & Role Administration",
    description: "System role definitions, permissions, and credential assignments",
    permissions: [
      { id: "role:view", action: "View", description: "Review role matrices and assigned user permissions" },
      { id: "role:manage", action: "Manage", description: "Create custom roles and configure assignable permissions" },
      { id: "user:manage", action: "Manage Users", description: "Create, update, and assign roles to system accounts" },
    ],
  },
  {
    id: "system",
    label: "System Settings & Audit Logs",
    description: "System audit trail, registration period windows, and health metrics",
    permissions: [
      { id: "audit:read", action: "Read Audit", description: "Inspect system audit logs and action trails" },
      { id: "settings:manage", action: "Manage Settings", description: "Modify global application configurations and windows" },
    ],
  },
];

export const BUILT_IN_ROLES: readonly UserRole[] = [
  "Super Admin",
  "HR Admin",
  "Education Admin",
  "Attendance Facilitator",
  "Education Facilitator",
  "Schedule Manager",
  "Teacher",
];

export const ROLE_PERMISSIONS: Record<Permission, readonly UserRole[]> = {
  // Existing baseline mappings (must preserve exact behavior for existing tests)
  "student:create": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "student:write": ["Super Admin", "HR Admin"],
  "payment:write": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "enrollment:write": ["Super Admin", "Education Admin"],
  "results:write": ["Super Admin", "Education Admin", "Education Facilitator"],
  "schedule:write": ["Super Admin", "Schedule Manager"],
  "facilitator:manage": ["Super Admin", "HR Admin", "Education Admin"],
  "department-admin:manage": ["Super Admin"],
  "audit:read": ["Super Admin"],

  // Expanded modular mappings
  "student:view": ["Super Admin", "HR Admin", "Education Admin", "Attendance Facilitator", "Education Facilitator", "Teacher"],
  "student:edit": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "student:delete": ["Super Admin"],
  "enrollment:view": ["Super Admin", "Education Admin", "HR Admin", "Attendance Facilitator"],
  "enrollment:approve": ["Super Admin", "Education Admin"],
  "attendance:view": ["Super Admin", "HR Admin", "Education Admin", "Attendance Facilitator", "Education Facilitator", "Teacher"],
  "attendance:record": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "attendance:export": ["Super Admin", "HR Admin", "Education Admin"],
  "schedule:view": ["Super Admin", "Schedule Manager", "Education Admin", "Attendance Facilitator", "Education Facilitator", "Teacher"],
  "schedule:manage": ["Super Admin"],
  "subject:view": ["Super Admin", "Education Admin", "Education Facilitator", "Teacher"],
  "subject:manage": ["Super Admin", "Education Admin"],
  "facilitator:view": ["Super Admin", "HR Admin", "Education Admin"],
  "department:view": ["Super Admin", "HR Admin", "Education Admin"],
  "payment:view": ["Super Admin", "HR Admin", "Attendance Facilitator"],
  "results:view": ["Super Admin", "Education Admin", "Education Facilitator"],
  "report:view": ["Super Admin", "HR Admin", "Education Admin", "Attendance Facilitator", "Education Facilitator"],
  "report:export": ["Super Admin", "HR Admin", "Education Admin"],
  "idcard:generate": ["Super Admin", "HR Admin", "Education Admin"],
  "qr:verify": ["Super Admin", "HR Admin", "Education Admin", "Attendance Facilitator"],
  "role:view": ["Super Admin"],
  "role:manage": ["Super Admin"],
  "user:manage": ["Super Admin"],
  "settings:manage": ["Super Admin"],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  "Super Admin": Object.keys(ROLE_PERMISSIONS) as Permission[],
  "HR Admin": [
    "student:view", "student:create", "student:edit",
    "enrollment:view",
    "attendance:view", "attendance:record", "attendance:export",
    "facilitator:view", "facilitator:manage",
    "department:view",
    "payment:view", "payment:write",
    "report:view", "report:export",
    "idcard:generate", "qr:verify",
  ],
  "HR Facilitator": [
    "student:view", "student:create", "student:edit",
    "enrollment:view",
    "attendance:view", "attendance:record",
    "schedule:view",
    "payment:view", "payment:write",
    "report:view",
    "qr:verify",
  ],
  "Education Admin": [
    "student:view",
    "enrollment:view", "enrollment:write", "enrollment:approve",
    "attendance:view", "attendance:export",
    "schedule:view",
    "subject:view", "subject:manage",
    "facilitator:view", "facilitator:manage",
    "department:view",
    "results:view", "results:write",
    "report:view", "report:export",
    "idcard:generate", "qr:verify",
  ],
  "Educational Facilitator": [
    "student:view",
    "attendance:view",
    "schedule:view",
    "subject:view",
    "results:view", "results:write",
    "report:view",
  ],
  "Attendance Facilitator": [
    "student:view", "student:create", "student:edit",
    "enrollment:view",
    "attendance:view", "attendance:record",
    "schedule:view",
    "payment:view", "payment:write",
    "report:view",
    "qr:verify",
  ],
  "Education Facilitator": [
    "student:view",
    "attendance:view",
    "schedule:view",
    "subject:view",
    "results:view", "results:write",
    "report:view",
  ],
  "Schedule Manager": [
    "schedule:view", "schedule:write",
  ],
  "Teacher": [
    "student:view",
    "attendance:view",
    "schedule:view",
    "subject:view",
  ],
};

/**
 * Synchronous client-and-server permission check.
 * Checks optional customRolePermissions or overrides map first, then falls back to base ROLE_PERMISSIONS.
 * Super Admin is permanently protected and cannot be denied.
 */
export function canAccess(
  role: unknown,
  permission: Permission,
  customOrOverrides?: string[] | Record<string, boolean>,
): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  // Super Admin protection rule: Super Admin always retains all permissions
  if (normalizedRole === "Super Admin") {
    return true;
  }

  // If custom permissions array is passed
  if (Array.isArray(customOrOverrides)) {
    return customOrOverrides.includes(permission);
  }

  // If overrides record is passed
  if (customOrOverrides && typeof customOrOverrides === "object") {
    const overrideKey = `${normalizedRole}:${permission}`;
    if (typeof (customOrOverrides as Record<string, boolean>)[overrideKey] === "boolean") {
      return (customOrOverrides as Record<string, boolean>)[overrideKey];
    }
  }

  return hasAnyRole(normalizedRole, ROLE_PERMISSIONS[permission]);
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

  if (path.startsWith("/schedule")) {
    return normalizedRole === "Schedule Manager" || normalizedRole === "Super Admin";
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
