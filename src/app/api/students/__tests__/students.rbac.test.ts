/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/students/route";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/lib/mongodb";
import { ensureStudentCreationAllowed } from "@/lib/studentService";

// Mock dependencies
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/studentService", () => ({
  ...jest.requireActual("@/lib/studentService"),
  validateStudentCreationBody: jest.fn().mockReturnValue(null), // Always valid body structure for testing RBAC
  ensureStudentCreationAllowed: jest.fn(),
  prepareStudentInsertPayload: jest.fn().mockImplementation((body) => body),
  serializeStudent: jest.fn().mockImplementation((student) => student),
}));

jest.mock("@/lib/distributedLock", () => ({
  withLock: jest.fn((key, cb) => cb()),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/auditLog", () => ({
  logAudit: jest.fn(),
}));

jest.mock("@/lib/notifications", () => ({
  createNotification: jest.fn(),
}));

jest.mock("@/lib/enrollmentService", () => ({
  createEnrollment: jest.fn().mockResolvedValue({}),
}));

describe("Phase 1 RBAC Guardrails: POST /api/students", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null), // No existing student by default
        insertOne: jest.fn().mockResolvedValue({ insertedId: "507f1f77bcf86cd799439011" }),
      }),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  // Matrix D: No session
  test("D. Unauthenticated request returns 401 Unauthorized", async () => {
    (getToken as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      body: JSON.stringify({
        Unique_ID: "ST-TEST-001",
        First_Name: "Test",
        Father_Name: "User",
        Grade: "Grade 5",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // Matrix C & Phase 1 Core: Role spoof attempt in request body
  test("C. Role spoofing attempt in body is ignored; session role is honored", async () => {
    // Authenticated session is strictly an Attendance Facilitator
    (getToken as jest.Mock).mockResolvedValue({
      email: "facilitator@example.com",
      role: "Attendance Facilitator",
      grade: ["Grade 5"],
    });

    // Mock authorization service to track what role it actually received
    (ensureStudentCreationAllowed as jest.Mock).mockImplementation(async ({ userRole }) => {
      // If spoofing succeeded, userRole would be "Super Admin". 
      // It must remain "Attendance Facilitator".
      if (userRole === "Super Admin") {
        return { ok: false, status: 403, error: "Privilege escalation detected" };
      }
      return { ok: true };
    });

    // Client tries to inject Super Admin role & email via JSON body
    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRole: "Super Admin",
        userEmail: "admin@example.com",
        Unique_ID: "ST-TEST-001",
        First_Name: "Test",
        Father_Name: "User",
        Grade: "Grade 5",
      }),
    });

    const res = await POST(req);

    // Verify ensureStudentCreationAllowed was called with session role, NOT body role
    expect(ensureStudentCreationAllowed).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: "Attendance Facilitator",
        userEmail: "facilitator@example.com",
      })
    );
    expect(res.status).toBe(201);
  });

  // Matrix B: Facilitator blocked by grade mismatch
  test("B. Facilitator blocked when creating student outside assigned grade scope (403)", async () => {
    (getToken as jest.Mock).mockResolvedValue({
      email: "facilitator@example.com",
      role: "Attendance Facilitator",
      grade: ["Grade 5", "Grade 6"],
    });

    (ensureStudentCreationAllowed as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Restricted grade scope / not allowed",
    });

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      body: JSON.stringify({
        Unique_ID: "ST-TEST-002",
        First_Name: "Test",
        Father_Name: "User",
        Grade: "Grade 10", // Outside assigned grades [Grade 5, Grade 6]
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Restricted grade");
  });

  // Matrix A: Valid facilitator allowed case
  test("A. Valid facilitator allowed when grade matches scope (201)", async () => {
    (getToken as jest.Mock).mockResolvedValue({
      email: "facilitator@example.com",
      role: "Attendance Facilitator",
      grade: ["Grade 5", "Grade 6"],
    });

    (ensureStudentCreationAllowed as jest.Mock).mockResolvedValue({ ok: true });

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      body: JSON.stringify({
        Unique_ID: "ST-TEST-003",
        First_Name: "Valid",
        Father_Name: "Student",
        Grade: "Grade 5",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data._id).toBeDefined();
  });

  // Matrix E: Super Admin success
  test("E. Super Admin can successfully create students", async () => {
    (getToken as jest.Mock).mockResolvedValue({
      email: "superadmin@example.com",
      role: "Super Admin",
    });

    (ensureStudentCreationAllowed as jest.Mock).mockResolvedValue({ ok: true });

    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      body: JSON.stringify({
        Unique_ID: "ST-TEST-004",
        First_Name: "Super",
        Father_Name: "Admin",
        Grade: "Grade 12",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data._id).toBeDefined();
  });
});