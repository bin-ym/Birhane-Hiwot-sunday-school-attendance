/**
 * @jest-environment node
 */
import { canAccess, normalizeRole } from "@/lib/rbac";

describe("Phase 5 RBAC - centralized permission registry", () => {
  it("normalizes alias values before checking permissions", () => {
    expect(normalizeRole("HR Facilitator")).toBe("Attendance Facilitator");
    expect(normalizeRole("Educational Facilitator")).toBe("Education Facilitator");
  });

  it("applies the policy matrix to domain-specific actions", () => {
    expect(canAccess("Education Admin", "enrollment:write")).toBe(true);
    expect(canAccess("HR Admin", "enrollment:write")).toBe(false);
    expect(canAccess("Schedule Manager", "schedule:write")).toBe(true);
    expect(canAccess("HR Admin", "department-admin:manage")).toBe(false);
    expect(canAccess("Super Admin", "audit:read")).toBe(true);
  });
});
