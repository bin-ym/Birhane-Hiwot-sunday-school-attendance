/**
 * @jest-environment node
 */
import {
  canManageEnrollment,
  canManageSchedules,
  normalizeRole,
} from "@/lib/rbac";

describe("Phase 4 RBAC - schedule manager support", () => {
  it("accepts the schedule manager role while keeping it out of enrollment management", () => {
    expect(normalizeRole("Schedule Manager")).toBe("Schedule Manager");
    expect(canManageSchedules("Schedule Manager")).toBe(true);
    expect(canManageEnrollment("Schedule Manager")).toBe(false);
  });

  it("keeps HR facilitator aliases mapped to the attendance domain", () => {
    expect(normalizeRole("HR Facilitator")).toBe("Attendance Facilitator");
    expect(canManageSchedules("HR Facilitator")).toBe(false);
  });
});
