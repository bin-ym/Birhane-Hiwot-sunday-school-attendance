/**
 * @jest-environment node
 */
import { isPathAuthorizedForRole } from "@/lib/rbac";
import { validateAttendanceSubmission } from "@/lib/validation";
import { validatePaymentPayload } from "@/lib/validation";

describe("Phase 6 business validation and UI authorization", () => {
  it("allows attendance facilitators into the HR route while blocking education facilitators from the education area", () => {
    expect(isPathAuthorizedForRole("/hr", "Attendance Facilitator")).toBe(true);
    expect(isPathAuthorizedForRole("/education", "Education Facilitator")).toBe(false);
    expect(isPathAuthorizedForRole("/admin/reports", "Education Admin")).toBe(true);
  });

  it("rejects malformed attendance payloads before writing to the database", () => {
    const result = validateAttendanceSubmission({
      date: "2026-03-01",
      attendance: [{ studentId: "", present: true }],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("studentId");
  });

  it("rejects invalid payment month or status values", () => {
    const result = validatePaymentPayload({
      year: "2027",
      studentId: "507f1f77bcf86cd799439011",
      data: { InvalidMonth: "Paid", Meskerem: "Maybe" },
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid");
  });
});
