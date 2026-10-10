/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { GET, POST } from "@/app/api/enrollments/route";
import { GET as getCurrentEnrollmentRoute } from "@/app/api/enrollments/current/route";
import { getToken } from "next-auth/jwt";
import {
  createEnrollment,
  getEnrollmentsByStudent,
  getActiveEnrollmentForCurrentYear,
} from "@/lib/enrollmentService";
import { getDb } from "@/lib/mongodb";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/enrollmentService", () => ({
  createEnrollment: jest.fn(),
  getEnrollmentsByStudent: jest.fn(),
  getActiveEnrollmentForCurrentYear: jest.fn(),
  EnrollmentServiceError: class EnrollmentServiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

describe("Phase 1 — Enrollment Dual Identifier Compatibility", () => {
  const mockStudentId = new ObjectId();
  const mockUniqueId = "ብሕ/18/07/001";
  const mockEnrollmentId = new ObjectId();

  let mockStudentsCollection: any;
  let mockDbInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStudentsCollection = {
      findOne: jest.fn().mockImplementation((query: any) => {
        if (query.Unique_ID === mockUniqueId) {
          return Promise.resolve({
            _id: mockStudentId,
            Unique_ID: mockUniqueId,
            First_Name: "አበበ",
            Father_Name: "ከበደ",
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockDbInstance = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === "students") return mockStudentsCollection;
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
    };

    (getDb as jest.Mock).mockResolvedValue(mockDbInstance);
    (getToken as jest.Mock).mockResolvedValue({
      role: "Super Admin",
      email: "admin@church.org",
      id: "admin-1",
    });
  });

  describe("1. GET /api/enrollments (Enrollment History Resolution)", () => {
    it("loads enrollment history using a canonical MongoDB ObjectId", async () => {
      const mockList = [
        {
          _id: mockEnrollmentId,
          studentId: mockStudentId,
          academicYear: "2018",
          classification: "Regular",
          grade: "ሰባተኛ ክፍል",
          status: "active",
          isCurrent: true,
          uniqueId: "ENR-001",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (getEnrollmentsByStudent as jest.Mock).mockResolvedValue(mockList);

      const req = new NextRequest(
        `http://localhost:3000/api/enrollments?studentId=${mockStudentId.toHexString()}`,
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].studentId).toBe(mockStudentId.toHexString());
      expect(getEnrollmentsByStudent).toHaveBeenCalledWith(mockStudentId);
    });

    it("loads enrollment history using school-facing Unique_ID (dual identifier resolution)", async () => {
      const mockList = [
        {
          _id: mockEnrollmentId,
          studentId: mockStudentId,
          academicYear: "2018",
          classification: "Regular",
          grade: "ሰባተኛ ክፍል",
          status: "active",
          isCurrent: true,
          uniqueId: "ENR-001",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (getEnrollmentsByStudent as jest.Mock).mockResolvedValue(mockList);

      const req = new NextRequest(
        `http://localhost:3000/api/enrollments?studentId=${encodeURIComponent(mockUniqueId)}`,
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockStudentsCollection.findOne).toHaveBeenCalledWith(
        { Unique_ID: mockUniqueId },
        { projection: { _id: 1 } },
      );
      expect(getEnrollmentsByStudent).toHaveBeenCalledWith(mockStudentId);
      expect(data).toHaveLength(1);
    });

    it("returns 404 when non-ObjectId identifier is not found in students collection", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/enrollments?studentId=UNKNOWN-ID-999",
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Student not found");
      expect(getEnrollmentsByStudent).not.toHaveBeenCalled();
    });

    it("returns 400 when studentId parameter is missing or empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/enrollments");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("studentId is required");
    });
  });

  describe("2. POST /api/enrollments (Creation with Identifier Resolution)", () => {
    it("creates an enrollment when studentId is supplied as a school-facing Unique_ID", async () => {
      (createEnrollment as jest.Mock).mockResolvedValue({
        _id: mockEnrollmentId,
        studentId: mockStudentId,
        academicYear: "2018",
        classification: "Regular",
        grade: "ሰባተኛ ክፍል",
        status: "active",
        uniqueId: "ENR-002",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: mockUniqueId,
          academicYear: "2018",
          classification: "Regular",
          grade: "ሰባተኛ ክፍል",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(mockStudentsCollection.findOne).toHaveBeenCalledWith(
        { Unique_ID: mockUniqueId },
        { projection: { _id: 1 } },
      );
      expect(createEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: mockStudentId,
          academicYear: "2018",
          classification: "Regular",
        }),
      );
      expect(data._id).toBe(mockEnrollmentId.toHexString());
    });

    it("returns 400 when studentId cannot be resolved to any student", async () => {
      const req = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "NON-EXISTENT-CODE",
          academicYear: "2018",
          classification: "Regular",
          grade: "ሰባተኛ ክፍል",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Valid studentId is required");
      expect(createEnrollment).not.toHaveBeenCalled();
    });
  });

  describe("3. GET /api/enrollments/current (Current Placement Resolution)", () => {
    it("resolves current enrollment using school-facing Unique_ID", async () => {
      const mockCurrent = {
        _id: mockEnrollmentId,
        studentId: mockStudentId,
        academicYear: "2018",
        classification: "Regular",
        grade: "ሰባተኛ ክፍል",
        status: "active",
        isCurrent: true,
        uniqueId: "ENR-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (getActiveEnrollmentForCurrentYear as jest.Mock).mockResolvedValue(mockCurrent);

      const req = new NextRequest(
        `http://localhost:3000/api/enrollments/current?studentId=${encodeURIComponent(mockUniqueId)}`,
      );
      const res = await getCurrentEnrollmentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(getActiveEnrollmentForCurrentYear).toHaveBeenCalledWith(
        mockStudentId,
        undefined,
      );
      expect(data.studentId).toBe(mockStudentId.toHexString());
    });

    it("returns 404 for current enrollment when identifier is unknown", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/enrollments/current?studentId=UNKNOWN-ID",
      );
      const res = await getCurrentEnrollmentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Student not found");
    });
  });
});
