// src/lib/roleThemes.ts

/**
 * Map a role title string to the corresponding role theme CSS class.
 *
 * Role titles as used in layouts:
 * - "Super Admin"                      → "role-admin"
 * - "HR Admin", "Attendance Facilitator"  → "role-hr"
 * - "Education Admin", "Education Facilitator" → "role-education"
 * - "Facilitator", "Attendance Facilitator" (facilitator portal) → "role-facilitator"
 *
 * Falls back to "role-admin" for unknown roles.
 */
export function getRoleThemeClass(roleTitle: string): string {
  const rt = roleTitle.toLowerCase();

  if (rt.includes("super admin")) {
    return "role-admin";
  }
  if (rt.includes("hr")) {
    return "role-hr";
  }
  if (rt.includes("education")) {
    return "role-education";
  }
  if (rt.includes("facilitator")) {
    return "role-facilitator";
  }
  return "role-admin";
}
