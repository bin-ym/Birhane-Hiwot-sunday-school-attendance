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

describe("Phase 1 RBAC - grade scope enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue({
      email: "facilitator@example.com",
      role: "Attendance Facilitator",
      grade: ["Grade 5", "Grade 6"],
    });

    (getDb as jest.Mock).mockResolvedValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: "507f1f77bcf86cd799439011" }),
      }),
    });
  });

  it("rejects student creation when the grade is outside the facilitator scope", async () => {
    (ensureStudentCreationAllowed as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Restricted grade scope / not allowed",
    });

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Unique_ID: "ST-003",
        First_Name: "Denied",
        Father_Name: "Student",
        Grade: "Grade 10",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Restricted grade");
  });
});
