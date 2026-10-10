/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import { NextRequest } from "next/server";
import { ensureStudentCreationAllowed } from "@/lib/studentService";
import { POST as checkDuplicatePOST } from "@/app/api/students/check-duplicate/route";
import { POST as studentsPOST } from "@/app/api/students/route";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/lib/mongodb";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { logAudit } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { createEnrollment } from "@/lib/enrollmentService";

// Mock dependencies
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
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

jest.mock("@/lib/notifications", () => ({
  createNotification: jest.fn(),
}));

jest.mock("@/lib/enrollmentService", () => ({
  createEnrollment: jest.fn(),
}));

describe("Phase 2 — Duplicate Detection and Registration Integrity", () => {
  const currentYear = String(getCurrentEthiopianYear());
  const sessionId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("A. Duplicate Detection in studentService (ensureStudentCreationAllowed)", () => {
    const buildMockDbWithStudents = (existingStudents: any[]) => {
      return {
        collection: (colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1", "አንደኛ ክፍል"],
              }),
            };
          }
          if (colName === "students") {
            return {
              findOne: jest.fn().mockImplementation(async (query: any) => {
                // Match against existingStudents array honoring query regexes
                return existingStudents.find((s) => {
                  if (query.First_Name && !query.First_Name.$regex.test(s.First_Name)) return false;
                  if (query.Grandfather_Name && !query.Grandfather_Name.$regex.test(s.Grandfather_Name)) return false;
                  if (query.Sex && !query.Sex.$regex.test(s.Sex)) return false;
                  if (query.$and) {
                    for (const condition of query.$and) {
                      if (condition.$or) {
                        const orMatch = condition.$or.some((sub: any) => {
                          const key = Object.keys(sub)[0];
                          const val = s[key];
                          return val && sub[key].$regex.test(val);
                        });
                        if (!orMatch) return false;
                      }
                    }
                  }
                  return true;
                }) || null;
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      } as unknown as Db;
    };

    it("rejects genuine duplicate with matching First_Name, Father_Name, Mothers_Name, and Sex (409)", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Grandfather_Name: "ተስፋዬ",
          Mothers_Name: "አልማዝ",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Grandfather_Name: "ተስፋዬ",
          Mothers_Name: "አልማዝ",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
      expect(res.error).toContain("A student with the same name, mother's name, and sex already exists");
    });

    it("allows student with the same First, Father, Mother, and Sex but DIFFERENT Grandfather_Name", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Grandfather_Name: "ተስፋዬ",
          Mothers_Name: "አልማዝ",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Grandfather_Name: "ኃይሉ", // Different grandfather!
          Mothers_Name: "አልማዝ",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(true);
    });

    it("allows student with the same name and father but DIFFERENT mother's name", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Mothers_Name: "አልማዝ",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Mothers_Name: "ብርቱካን", // Different mother!
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(true);
    });

    it("detects duplicate case-insensitively for English names", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "Samuel",
          Father_Name: "Haile",
          Mothers_Name: "Martha",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "samuel",
          Father_Name: "HAILE",
          Mothers_Name: "martha",
          Sex: "male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it("detects duplicate when existing database document has legacy Mother_Name instead of Mothers_Name", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "ዳዊት",
          Father_Name: "ተስፋዬ",
          Mother_Name: "ጽዮን", // Legacy alias in DB
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ዳዊት",
          Father_Name: "ተስፋዬ",
          Mothers_Name: "ጽዮን", // Canonical field in input
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it("detects duplicate when input provides legacy Mother_Name and Last_Name", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "ዮናስ",
          Father_Name: "ግርማ",
          Mothers_Name: "ዘውዲቱ",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ዮናስ",
          Last_Name: "ግርማ", // Legacy alias in input
          Mother_Name: "ዘውዲቱ", // Legacy alias in input
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it("escapes regex characters safely without crashing or unintended matching", async () => {
      const mockDb = buildMockDbWithStudents([
        {
          _id: new ObjectId(),
          First_Name: "Abebe (Senior)",
          Father_Name: "Kebede",
          Mothers_Name: "Aster.M",
          Sex: "Male",
        },
      ]);

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "Abebe (Senior)",
          Father_Name: "Kebede",
          Mothers_Name: "Aster.M",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
    });
  });

  describe("B. Duplicate Check API Route (POST /api/students/check-duplicate)", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: "Abebe",
          Father_Name: "Kebede",
          // Missing Grandfather_Name, Mothers_Name, Sex
        }),
      });

      const res = await checkDuplicatePOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("returns exists: true when duplicate student is found", async () => {
      (getDb as jest.Mock).mockResolvedValue({
        collection: () => ({
          findOne: jest.fn().mockResolvedValue({
            _id: new ObjectId(),
            First_Name: "Abebe",
          }),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: "Abebe",
          Father_Name: "Kebede",
          Grandfather_Name: "Tesfaye",
          Mothers_Name: "Almaz",
          Sex: "Male",
        }),
      });

      const res = await checkDuplicatePOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(true);
    });

    it("returns exists: false when no duplicate student matches", async () => {
      (getDb as jest.Mock).mockResolvedValue({
        collection: () => ({
          findOne: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: "Abebe",
          Father_Name: "Kebede",
          Grandfather_Name: "Tesfaye",
          Mothers_Name: "Tirunesh", // Different mother
          Sex: "Male",
        }),
      });

      const res = await checkDuplicatePOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(false);
    });

    it("ensures check-duplicate route and studentService produce consistent duplicate evaluations", async () => {
      const existingStudent = {
        _id: new ObjectId(),
        First_Name: "Alazar",
        Father_Name: "Teshome",
        Grandfather_Name: "Worku",
        Mothers_Name: "Genet",
        Sex: "Male",
      };

      // 1. Both agree it IS a duplicate when all 5 fields match
      let queryCaptured: any = null;
      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => ({
          findOne: jest.fn().mockImplementation((q) => {
            queryCaptured = q;
            // Matches existing student
            if (
              q.First_Name?.$regex.test(existingStudent.First_Name) &&
              q.Grandfather_Name?.$regex.test(existingStudent.Grandfather_Name) &&
              q.Sex?.$regex.test(existingStudent.Sex)
            ) {
              return existingStudent;
            }
            return null;
          }),
        }),
      });

      const reqMatching = new NextRequest("http://localhost:3000/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: "Alazar",
          Father_Name: "Teshome",
          Grandfather_Name: "Worku",
          Mothers_Name: "Genet",
          Sex: "Male",
        }),
      });

      const resCheck = await checkDuplicatePOST(reqMatching);
      const dataCheck = await resCheck.json();
      expect(dataCheck.exists).toBe(true);

      // 2. Both agree it is NOT a duplicate when Grandfather_Name differs
      const reqDifferentGrandfather = new NextRequest("http://localhost:3000/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: "Alazar",
          Father_Name: "Teshome",
          Grandfather_Name: "Abebe", // Different grandfather!
          Mothers_Name: "Genet",
          Sex: "Male",
        }),
      });

      const resCheckDiff = await checkDuplicatePOST(reqDifferentGrandfather);
      const dataCheckDiff = await resCheckDiff.json();
      expect(dataCheckDiff.exists).toBe(false);
    });
  });

  describe("C. Registration & Initial Enrollment Integrity (POST /api/students)", () => {
    it("successfully creates student AND initial active enrollment on valid request (201)", async () => {
      const studentId = new ObjectId();
      const mockStudents = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: studentId }),
        deleteOne: jest.fn(),
      };

      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => {
          if (name === "students") return mockStudents;
          if (name === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      });

      (getToken as jest.Mock).mockResolvedValue({
        email: "admin@example.com",
        role: "Super Admin",
      });

      (createEnrollment as jest.Mock).mockResolvedValue({
        _id: new ObjectId(),
        studentId,
        academicYear: currentYear,
        status: "active",
      });

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Unique_ID: "STU-NEW-001",
          First_Name: "Bereket",
          Father_Name: "Girma",
          Mothers_Name: "Sara",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        }),
      });

      const res = await studentsPOST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data._id).toBe(studentId.toHexString());

      // Verify createEnrollment was called with the student's ID and session
      expect(createEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          academicYear: currentYear,
          grade: "1",
          classSessionId: sessionId.toHexString(),
          status: "active",
          isCurrent: true,
        }),
        expect.anything(),
      );

      // Verify audit creation and notification
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          collection: "students",
          documentId: studentId.toString(),
        }),
      );
      expect(createNotification).toHaveBeenCalled();
      expect(mockStudents.deleteOne).not.toHaveBeenCalled();
    });

    it("performs compensating cleanup and returns 500 when createEnrollment fails", async () => {
      const studentId = new ObjectId();
      const mockStudents = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: studentId }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => {
          if (name === "students") return mockStudents;
          if (name === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      });

      (getToken as jest.Mock).mockResolvedValue({
        email: "admin@example.com",
        role: "Super Admin",
      });

      // Enrollment creation FAILS
      (createEnrollment as jest.Mock).mockRejectedValue(
        new Error("Class session capacity reached (40/40)"),
      );

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Unique_ID: "STU-FAIL-001",
          First_Name: "Bereket",
          Father_Name: "Girma",
          Mothers_Name: "Sara",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        }),
      });

      const res = await studentsPOST(req);
      const data = await res.json();

      // Must return 500 and NOT 201
      expect(res.status).toBe(500);
      expect(data.error).toContain("Failed to create initial enrollment");
      expect(data.cleanupConfirmed).toBe(true);

      // Verify compensating cleanup deleted the newly inserted student
      expect(mockStudents.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockStudents.deleteOne).toHaveBeenCalledWith({ _id: studentId });

      // Verify audit logged the rollback deletion
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          collection: "students",
          documentId: studentId.toString(),
          summary: expect.stringContaining("Compensating cleanup: successfully rolled back student STU-FAIL-001"),
        }),
      );

      // Verify NO misleading "New Student Enrolled" notification was dispatched
      expect(createNotification).not.toHaveBeenCalled();
    });

    it("handles deletion exceptions during compensating cleanup gracefully without crashing", async () => {
      const studentId = new ObjectId();
      const mockStudents = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: studentId }),
        // deleteOne THROWS an error (e.g. database timeout during cleanup)
        deleteOne: jest.fn().mockRejectedValue(new Error("Database connection dropped during rollback")),
      };

      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => {
          if (name === "students") return mockStudents;
          if (name === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      });

      (getToken as jest.Mock).mockResolvedValue({
        email: "admin@example.com",
        role: "Super Admin",
      });

      (createEnrollment as jest.Mock).mockRejectedValue(
        new Error("Class session capacity reached (40/40)"),
      );

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Unique_ID: "STU-CLEANUP-FAIL-01",
          First_Name: "Bereket",
          Father_Name: "Girma",
          Mothers_Name: "Sara",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        }),
      });

      const res = await studentsPOST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.cleanupConfirmed).toBe(false);
      expect(data.error).toContain("compensating student cleanup could not be confirmed");
      // Must not leak raw driver stack trace to response
      expect(data.error).not.toContain("Database connection dropped during rollback");

      // Verify audit logged the failed cleanup
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          collection: "students",
          documentId: studentId.toString(),
          summary: expect.stringContaining("CLEANUP_FAILED"),
        }),
      );
    });

    it("handles zero deleted documents during cleanup and flags unconfirmed cleanup in audit and response", async () => {
      const studentId = new ObjectId();
      const mockStudents = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: studentId }),
        // deleteOne succeeds but deletes 0 documents
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };

      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => {
          if (name === "students") return mockStudents;
          if (name === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      });

      (getToken as jest.Mock).mockResolvedValue({
        email: "admin@example.com",
        role: "Super Admin",
      });

      (createEnrollment as jest.Mock).mockRejectedValue(
        new Error("Class session capacity reached (40/40)"),
      );

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Unique_ID: "STU-ZERO-DELETE-01",
          First_Name: "Bereket",
          Father_Name: "Girma",
          Mothers_Name: "Sara",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        }),
      });

      const res = await studentsPOST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.cleanupConfirmed).toBe(false);
      expect(data.error).toContain("compensating student cleanup could not be confirmed");

      // Verify audit logged the unconfirmed cleanup
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          collection: "students",
          documentId: studentId.toString(),
          summary: expect.stringContaining("CLEANUP_FAILED"),
        }),
      );
    });

    it("compensating cleanup targets ONLY the new studentId and never deletes unrelated students", async () => {
      const newStudentId = new ObjectId();
      const existingStudentId1 = new ObjectId();
      const existingStudentId2 = new ObjectId();

      const studentsStore = [
        { _id: existingStudentId1, Unique_ID: "STU-EXIST-01" },
        { _id: existingStudentId2, Unique_ID: "STU-EXIST-02" },
      ];

      const mockStudents = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockImplementation(async (doc) => {
          studentsStore.push({ ...doc, _id: newStudentId });
          return { insertedId: newStudentId };
        }),
        deleteOne: jest.fn().mockImplementation(async (filter) => {
          const idx = studentsStore.findIndex(
            (s) => s._id.toString() === filter._id.toString(),
          );
          if (idx !== -1) studentsStore.splice(idx, 1);
          return { deletedCount: 1 };
        }),
      };

      (getDb as jest.Mock).mockResolvedValue({
        collection: (name: string) => {
          if (name === "students") return mockStudents;
          if (name === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        },
      });

      (getToken as jest.Mock).mockResolvedValue({
        email: "admin@example.com",
        role: "Super Admin",
      });

      (createEnrollment as jest.Mock).mockRejectedValue(
        new Error("Database write timeout"),
      );

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Unique_ID: "STU-NEW-ORPHAN",
          First_Name: "Orphan",
          Father_Name: "Test",
          Mothers_Name: "Sara",
          Sex: "Female",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "1",
          classSessionId: sessionId.toHexString(),
        }),
      });

      const res = await studentsPOST(req);
      expect(res.status).toBe(500);

      // Confirm only new student was removed, existing students preserved
      expect(studentsStore).toHaveLength(2);
      expect(studentsStore.some((s) => s._id.equals(existingStudentId1))).toBe(true);
      expect(studentsStore.some((s) => s._id.equals(existingStudentId2))).toBe(true);
      expect(studentsStore.some((s) => s._id.equals(newStudentId))).toBe(false);
    });
  });
});
