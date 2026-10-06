/**
 * @jest-environment node
 */
import { validateEnrollmentPayload } from "@/lib/validation";

describe("Phase 7 business-flow integrity", () => {
  it("rejects enrollment payloads with invalid classification and sections", () => {
    expect(validateEnrollmentPayload({
      studentId: "507f1f77bcf86cd799439011",
      academicYear: "2027",
      classification: "Invalid",
      grade: "Grade 5",
    }).valid).toBe(false);

    expect(validateEnrollmentPayload({
      studentId: "507f1f77bcf86cd799439011",
      academicYear: "2027",
      classification: "Regular",
      grade: "Grade 5",
      section: "A-1",
    }).valid).toBe(false);
  });

  it("accepts valid enrollment payloads for business operations", () => {
    expect(validateEnrollmentPayload({
      studentId: "507f1f77bcf86cd799439011",
      academicYear: "2027",
      classification: "Regular",
      grade: "Grade 5",
      section: "A",
    }).valid).toBe(true);
  });
});
