/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/enrollments/route";
import { getToken } from "next-auth/jwt";
import { createEnrollment } from "@/lib/enrollmentService";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/enrollmentService", () => ({
  createEnrollment: jest.fn(),
  getEnrollmentsByStudent: jest.fn(),
  EnrollmentServiceError: class EnrollmentServiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  updateEnrollmentSection: jest.fn(),
}));

describe("Phase 3 RBAC - enrollment domain enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks HR Admin from creating enrollment records", async () => {
    (getToken as jest.Mock).mockResolvedValue({ role: "HR Admin" });

    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "507f1f77bcf86cd799439011",
        academicYear: "2027",
        classification: "Regular",
        grade: "Grade 5",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("allows Education Admin to create enrollment records", async () => {
    (getToken as jest.Mock).mockResolvedValue({ role: "Education Admin" });
    (createEnrollment as jest.Mock).mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      studentId: "507f1f77bcf86cd799439011",
      academicYear: "2027",
      classification: "Regular",
      grade: "Grade 5",
      section: null,
    });

    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "507f1f77bcf86cd799439011",
        academicYear: "2027",
        classification: "Regular",
        grade: "Grade 5",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
  });
});
