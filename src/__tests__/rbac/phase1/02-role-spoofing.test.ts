/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/students/route";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/lib/mongodb";
import { ensureStudentCreationAllowed } from "@/lib/studentService";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/studentService", () => ({
  ...jest.requireActual("@/lib/studentService"),
  validateStudentCreationBody: jest.fn().mockReturnValue(null),
  ensureStudentCreationAllowed: jest.fn(),
  prepareStudentInsertPayload: jest.fn().mockImplementation((body) => body),
}));

jest.mock("@/lib/distributedLock", () => ({
  withLock: jest.fn((_, cb) => cb()),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/auditLog", () => ({
  logAudit: jest.fn(),
}));

jest.mock("@/lib/enrollmentService", () => ({
  createEnrollment: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/lib/notifications", () => ({
  createNotification: jest.fn(),
}));

describe("Phase 1 RBAC - role spoofing protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue({
      email: "facilitator@example.com",
      role: "Attendance Facilitator",
      grade: ["Grade 5"],
    });

    (getDb as jest.Mock).mockResolvedValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: "507f1f77bcf86cd799439011" }),
      }),
    });
  });

  it("ignores userRole and userEmail from the request body and uses the authenticated session", async () => {
    (ensureStudentCreationAllowed as jest.Mock).mockImplementation(async ({ userRole, userEmail }) => {
      if (userRole === "Super Admin") {
        return { ok: false, status: 403, error: "Privilege escalation detected" };
      }
      return { ok: true, userEmail };
    });

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRole: "Super Admin",
        userEmail: "admin@example.com",
        Unique_ID: "ST-002",
        First_Name: "Test",
        Father_Name: "User",
        Grade: "Grade 5",
      }),
    });

    const res = await POST(req);

    expect(ensureStudentCreationAllowed).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: "Attendance Facilitator",
        userEmail: "facilitator@example.com",
      }),
    );
    expect(res.status).toBe(201);
  });
});
