/**
 * @jest-environment node
 */
import { Db, ObjectId } from "mongodb";
import path from "node:path";
import fs from "node:fs";

// Import reconciliation functions from scripts/reconcile-legacy-enrollments.mjs
import {
  createReadOnlyDb,
  reconcileLegacyEnrollments,
  formatAsJson,
  formatAsCsv,
  formatAsConsole,
  safelyWriteReportFile,
  validatePreflightConfig,
  verifyReadOnlyPermissions,
} from "../../../scripts/reconcile-legacy-enrollments.mjs";
import { auditStudentUniqueIdConstraintsCore } from "../../../scripts/audit-student-unique-id.mjs";

interface MockStudent {
  _id: ObjectId;
  Unique_ID?: string;
  First_Name?: string;
  Father_Name?: string;
  Academic_Year?: string;
  Grade?: string;
  Class?: string;
  Classification?: string;
  status?: string;
  Phone_Number?: string;
  Address?: string;
  Mothers_Name?: string;
}

interface MockEnrollment {
  _id: ObjectId;
  studentId: ObjectId | string;
  uniqueId?: string;
  academicYear?: string;
  grade?: string;
  classification?: string;
  status?: string;
  isCurrent?: boolean;
}

interface MockAttendance {
  _id?: ObjectId;
  studentId: string | ObjectId;
  date?: string;
  present?: boolean;
}

/**
 * Creates an in-memory mock database that conforms to MongoDB Collection API
 * and spies on any mutating calls to verify strict read-only execution.
 */
function createMockDbFixture(initialData: {
  students?: MockStudent[];
  enrollments?: MockEnrollment[];
  attendance?: MockAttendance[];
}) {
  const students = [...(initialData.students || [])];
  const enrollments = [...(initialData.enrollments || [])];
  const attendance = [...(initialData.attendance || [])];

  const mutationSpy = jest.fn();

  function matchCondition(item: any, cond: any): boolean {
    if (!cond || typeof cond !== "object") return true;
    for (const [key, val] of Object.entries(cond)) {
      if (key === "$or" && Array.isArray(val)) {
        const anyMatch = val.some((subCond) => matchCondition(item, subCond));
        if (!anyMatch) return false;
        continue;
      }
      const itemVal = item[key];
      if (val instanceof ObjectId) {
        if (!itemVal) return false;
        if (itemVal.toString() !== val.toString()) return false;
      } else if (itemVal instanceof ObjectId) {
        if (itemVal.toString() !== String(val)) return false;
      } else if (itemVal !== val) {
        return false;
      }
    }
    return true;
  }

  function createCursor<T>(items: T[]) {
    let index = 0;
    let limitCount = Infinity;

    return {
      sort(_spec: any) {
        return this;
      },
      batchSize(_size: number) {
        return this;
      },
      limit(n: number) {
        limitCount = n;
        return this;
      },
      async hasNext(): Promise<boolean> {
        return index < items.length && index < limitCount;
      },
      async next(): Promise<T | null> {
        if (index < items.length && index < limitCount) {
          return items[index++];
        }
        return null;
      },
      async toArray(): Promise<T[]> {
        return items.slice(0, limitCount);
      },
    };
  }

  const collections: Record<string, any> = {
    students: {
      countDocuments: jest.fn(async (filter?: any) => {
        return students.filter((s) => matchCondition(s, filter)).length;
      }),
      find: jest.fn((filter?: any, _options?: any) => {
        const filtered = students.filter((s) => matchCondition(s, filter));
        return createCursor(filtered);
      }),
      aggregate: jest.fn((pipeline: any[]) => {
        // Group by Unique_ID duplicate check
        const counts = new Map<string, { count: number; studentIds: ObjectId[] }>();
        for (const s of students) {
          const uId = typeof s.Unique_ID === "string" ? s.Unique_ID.trim() : "";
          if (uId) {
            const entry = counts.get(uId) || { count: 0, studentIds: [] };
            entry.count++;
            entry.studentIds.push(s._id);
            counts.set(uId, entry);
          }
        }
        const duplicateGroups: Array<{ _id: string; count: number; studentIds: ObjectId[] }> = [];
        for (const [uId, entry] of counts.entries()) {
          if (entry.count > 1) {
            duplicateGroups.push({ _id: uId, count: entry.count, studentIds: entry.studentIds });
          }
        }
        return {
          toArray: async () => duplicateGroups,
        };
      }),
      insertOne: mutationSpy,
      insertMany: mutationSpy,
      updateOne: mutationSpy,
      updateMany: mutationSpy,
      replaceOne: mutationSpy,
      deleteOne: mutationSpy,
      deleteMany: mutationSpy,
      bulkWrite: mutationSpy,
      createIndex: mutationSpy,
    },
    enrollments: {
      countDocuments: jest.fn(async (filter?: any) => {
        return enrollments.filter((e) => matchCondition(e, filter)).length;
      }),
      find: jest.fn((filter?: any, _options?: any) => {
        const filtered = enrollments.filter((e) => matchCondition(e, filter));
        return createCursor(filtered);
      }),
      aggregate: jest.fn((pipeline: any[]) => {
        // Orphan check: find enrollments with studentId not in students
        const studentIdSet = new Set(students.map((s) => s._id.toString()));
        const orphans = enrollments.filter((e) => {
          const sIdStr = e.studentId instanceof ObjectId ? e.studentId.toString() : String(e.studentId);
          return !studentIdSet.has(sIdStr);
        });
        return {
          toArray: async () => orphans,
        };
      }),
      insertOne: mutationSpy,
      insertMany: mutationSpy,
      updateOne: mutationSpy,
      updateMany: mutationSpy,
      replaceOne: mutationSpy,
      deleteOne: mutationSpy,
      deleteMany: mutationSpy,
      bulkWrite: mutationSpy,
      createIndex: mutationSpy,
    },
    attendance: {
      countDocuments: jest.fn(async (filter?: any) => {
        return attendance.filter((a) => matchCondition(a, filter)).length;
      }),
      find: jest.fn((filter?: any, _options?: any) => {
        const filtered = attendance.filter((a) => matchCondition(a, filter));
        return createCursor(filtered);
      }),
      insertOne: mutationSpy,
      insertMany: mutationSpy,
      updateOne: mutationSpy,
      updateMany: mutationSpy,
      replaceOne: mutationSpy,
      deleteOne: mutationSpy,
      deleteMany: mutationSpy,
      bulkWrite: mutationSpy,
      createIndex: mutationSpy,
    },
  };

  const mockDb = {
    collection: (name: string) => {
      if (!collections[name]) {
        collections[name] = {
          countDocuments: jest.fn(async () => 0),
          find: jest.fn(() => createCursor([])),
          aggregate: jest.fn(() => ({ toArray: async () => [] })),
          insertOne: mutationSpy,
          updateOne: mutationSpy,
          deleteOne: mutationSpy,
        };
      }
      return collections[name];
    },
  } as unknown as Db;

  return { mockDb, collections, mutationSpy };
}

describe("Phase 5: Legacy Enrollment Reconciliation (Read-Only)", () => {
  describe("1. Students with matching enrollment records", () => {
    it("correctly identifies fully enrolled and matched students as ENROLLED_MATCHED", async () => {
      const studentId = new ObjectId();
      const uniqueId = "ብሕ/18/01/001";

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: uniqueId,
            First_Name: "Samuel",
            Father_Name: "Bekele",
            Academic_Year: "2018",
            Grade: "አንደኛ ክፍል",
            status: "active",
          },
        ],
        enrollments: [
          {
            _id: new ObjectId(),
            studentId,
            uniqueId,
            academicYear: "2018",
            grade: "አንደኛ ክፍል",
            status: "active",
            isCurrent: true,
          },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalStudentsExamined).toBe(1);
      expect(report.summary.totalStudentsWithEnrollments).toBe(1);
      expect(report.summary.totalStudentsWithoutEnrollments).toBe(0);
      expect(report.summary.totalConfirmedMissingEnrollments).toBe(0);
      expect(report.summary.totalRecordsRequiringManualReview).toBe(0);
      expect(report.flaggedRecords).toHaveLength(0);
      expect(fixture.mutationSpy).not.toHaveBeenCalled();
    });
  });

  describe("2. Students with no enrollment records (Confirmed Missing)", () => {
    it("identifies active students missing enrollments as CONFIRMED_MISSING_ENROLLMENT", async () => {
      const studentId = new ObjectId();
      const uniqueId = "ብሕ/18/02/045";

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: uniqueId,
            First_Name: "Abebe",
            Father_Name: "Kebede",
            Academic_Year: "2018",
            Grade: "ሁለተኛ ክፍል",
            Class: "Regular",
            status: "active",
          },
        ],
        enrollments: [], // No enrollment
        attendance: [
          {
            studentId: studentId.toString(),
            date: "2018-01-05",
            present: true,
          },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalStudentsExamined).toBe(1);
      expect(report.summary.totalStudentsWithEnrollments).toBe(0);
      expect(report.summary.totalStudentsWithoutEnrollments).toBe(1);
      expect(report.summary.totalConfirmedMissingEnrollments).toBe(1);
      expect(report.flaggedRecords).toHaveLength(1);

      const flagged = report.flaggedRecords[0];
      expect(flagged.category).toBe("CONFIRMED_MISSING_ENROLLMENT");
      expect(flagged.uniqueId).toBe(uniqueId);
      expect(flagged.attendanceCount).toBe(1);
      expect(flagged.requiresManualReview).toBe(false); // Has complete academic year & grade
      expect(flagged.verified).toBe(true);
      expect(flagged.recommendation).toContain("Candidate for future administrative backfill");
      expect(fixture.mutationSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. Legacy attendance records using Unique_ID", () => {
    it("correctly links historical attendance stored under Unique_ID (seed-from-excel format)", async () => {
      const studentId = new ObjectId();
      const uniqueId = "ብሕ/18/01/100";

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: uniqueId,
            First_Name: "Hanna",
            Father_Name: "Tesfaye",
            Academic_Year: "2018",
            Grade: "አንደኛ ክፍል",
            status: "active",
          },
        ],
        enrollments: [],
        attendance: [
          // Attendance record keyed by Unique_ID rather than ObjectId
          {
            studentId: uniqueId,
            date: "2018-01-12",
            present: true,
          },
          {
            studentId: uniqueId,
            date: "2018-01-19",
            present: true,
          },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalConfirmedMissingEnrollments).toBe(1);
      expect(report.flaggedRecords[0].attendanceCount).toBe(2);
      expect(report.flaggedRecords[0].finding).toContain("2 attendance mark(s)");
      expect(fixture.mutationSpy).not.toHaveBeenCalled();
    });
  });

  describe("4. Canonical ObjectId and string references", () => {
    it("matches enrollment whether studentId is stored as ObjectId or stringified ObjectId", async () => {
      const s1 = new ObjectId();
      const s2 = new ObjectId();

      const fixture = createMockDbFixture({
        students: [
          { _id: s1, Unique_ID: "STU-01", Academic_Year: "2018", Grade: "1" },
          { _id: s2, Unique_ID: "STU-02", Academic_Year: "2018", Grade: "2" },
        ],
        enrollments: [
          // s1 linked via canonical ObjectId
          { _id: new ObjectId(), studentId: s1, uniqueId: "STU-01", academicYear: "2018", grade: "1" },
          // s2 linked via stringified ObjectId
          { _id: new ObjectId(), studentId: s2.toString(), uniqueId: "STU-02", academicYear: "2018", grade: "2" },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalStudentsExamined).toBe(2);
      expect(report.summary.totalStudentsWithEnrollments).toBe(2);
      expect(report.summary.totalStudentsWithoutEnrollments).toBe(0);
      expect(report.flaggedRecords).toHaveLength(0);
    });

    it("flags identifier mismatch if enrollment studentId or uniqueId conflicts", async () => {
      const studentId = new ObjectId();
      const conflictingId = new ObjectId();

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: "STU-TARGET",
            First_Name: "Alazar",
            Academic_Year: "2018",
            Grade: "Grade 3",
          },
        ],
        enrollments: [
          // Enrollment matched by Unique_ID but has a conflicting studentId
          {
            _id: new ObjectId(),
            studentId: conflictingId,
            uniqueId: "STU-TARGET",
            academicYear: "2018",
            grade: "Grade 3",
          },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb, {
        orphanedCheck: false,
      });

      expect(report.summary.totalIdentifierMismatches).toBe(1);
      expect(report.summary.totalRecordsRequiringManualReview).toBe(1);
      expect(report.flaggedRecords[0].category).toBe("IDENTIFIER_MISMATCH");
      expect(report.flaggedRecords[0].requiresManualReview).toBe(true);
      expect(report.flaggedRecords[0].verified).toBe(false);
    });
  });

  describe("5. Duplicate and ambiguous Unique_ID references", () => {
    it("flags records sharing duplicate Unique_ID for manual review", async () => {
      const s1 = new ObjectId();
      const s2 = new ObjectId();
      const sharedUniqueId = "ብሕ/18/DUP/001";

      const fixture = createMockDbFixture({
        students: [
          { _id: s1, Unique_ID: sharedUniqueId, First_Name: "Student One", Academic_Year: "2018" },
          { _id: s2, Unique_ID: sharedUniqueId, First_Name: "Student Two", Academic_Year: "2018" },
        ],
        enrollments: [],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalStudentsExamined).toBe(2);
      expect(report.summary.totalDuplicateOrAmbiguousReferences).toBe(2);
      expect(report.summary.totalRecordsRequiringManualReview).toBe(2);

      const flagged = report.flaggedRecords;
      expect(flagged).toHaveLength(2);
      expect(flagged[0].category).toBe("DUPLICATE_OR_AMBIGUOUS_REFERENCE");
      expect(flagged[0].requiresManualReview).toBe(true);
      expect(flagged[0].verified).toBe(false);
    });
  });

  describe("6. Missing academic-year and incomplete information", () => {
    it("categorizes inactive student without attendance or academic metadata as POTENTIAL_GAP_INCOMPLETE_DATA", async () => {
      const studentId = new ObjectId();

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: "STU-OLD",
            First_Name: "Historical",
            Father_Name: "Student",
            status: "archived",
            // Missing Academic_Year and Grade
          },
        ],
        enrollments: [],
        attendance: [],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalPotentialGaps).toBe(1);
      expect(report.summary.totalRecordsRequiringManualReview).toBe(1);

      const flagged = report.flaggedRecords[0];
      expect(flagged.category).toBe("POTENTIAL_GAP_INCOMPLETE_DATA");
      expect(flagged.requiresManualReview).toBe(true);
      expect(flagged.verified).toBe(false);
      expect(flagged.finding).toContain("cannot be conclusively established");
    });

    it("requires manual review for active students missing academic year or grade", async () => {
      const studentId = new ObjectId();

      const fixture = createMockDbFixture({
        students: [
          {
            _id: studentId,
            Unique_ID: "STU-ACTIVE-NO-GRADE",
            First_Name: "Active",
            status: "active",
            // missing Grade and Academic_Year
          },
        ],
        enrollments: [],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalConfirmedMissingEnrollments).toBe(1);
      // Because year/grade is missing, manual review is set to true before backfilling
      expect(report.flaggedRecords[0].requiresManualReview).toBe(true);
    });
  });

  describe("7. Repeated script execution", () => {
    it("produces identical and deterministic reports on repeated runs without mutating data", async () => {
      const s1 = new ObjectId();
      const s2 = new ObjectId();

      const fixture = createMockDbFixture({
        students: [
          { _id: s1, Unique_ID: "STU-1", First_Name: "A", Academic_Year: "2018", Grade: "1", status: "active" },
          { _id: s2, Unique_ID: "STU-2", First_Name: "B", Academic_Year: "2018", Grade: "2", status: "active" },
        ],
        enrollments: [
          { _id: new ObjectId(), studentId: s1, uniqueId: "STU-1", academicYear: "2018", grade: "1" },
        ],
      });

      const report1 = await reconcileLegacyEnrollments(fixture.mockDb);
      const report2 = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report1.summary).toEqual(report2.summary);
      expect(report1.flaggedRecords.length).toBe(report2.flaggedRecords.length);
      expect(report1.summary.totalStudentsExamined).toBe(2);
      expect(report1.summary.totalStudentsWithEnrollments).toBe(1);
      expect(report1.summary.totalStudentsWithoutEnrollments).toBe(1);
      expect(fixture.mutationSpy).not.toHaveBeenCalled();
    });
  });

  describe("8. Strict Read-Only Behavior", () => {
    it("guarantees no insert, update, delete, or index operations are called", async () => {
      const fixture = createMockDbFixture({
        students: [
          { _id: new ObjectId(), Unique_ID: "STU-READONLY", Academic_Year: "2018", Grade: "3" },
        ],
        enrollments: [],
      });

      await reconcileLegacyEnrollments(fixture.mockDb);

      expect(fixture.mutationSpy).not.toHaveBeenCalled();
    });

    it("createReadOnlyDb throws if any mutating operation is attempted", () => {
      const mockRawDb = {
        collection: (name: string) => ({
          insertOne: jest.fn(),
          updateOne: jest.fn(),
          deleteOne: jest.fn(),
          bulkWrite: jest.fn(),
          find: jest.fn(),
        }),
      };

      const readOnlyDb = createReadOnlyDb(mockRawDb as unknown as Db);
      const col = readOnlyDb.collection("students");

      expect(() => col.insertOne({ test: 1 })).toThrow(/READ-ONLY VIOLATION/);
      expect(() => col.updateOne({ _id: 1 }, { $set: { test: 2 } })).toThrow(/READ-ONLY VIOLATION/);
      expect(() => col.deleteOne({ _id: 1 })).toThrow(/READ-ONLY VIOLATION/);
      expect(() => col.bulkWrite([])).toThrow(/READ-ONLY VIOLATION/);
    });
  });

  describe("9. Empty datasets and large-result cursor handling", () => {
    it("handles empty database gracefully with zero counts and empty arrays", async () => {
      const fixture = createMockDbFixture({
        students: [],
        enrollments: [],
        attendance: [],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb);

      expect(report.summary.totalStudentsExamined).toBe(0);
      expect(report.summary.totalStudentsWithEnrollments).toBe(0);
      expect(report.summary.totalStudentsWithoutEnrollments).toBe(0);
      expect(report.summary.totalConfirmedMissingEnrollments).toBe(0);
      expect(report.flaggedRecords).toHaveLength(0);
      expect(report.orphanedEnrollments).toHaveLength(0);
    });

    it("respects batchSize and limit parameters during cursor iteration", async () => {
      const students: MockStudent[] = [];
      for (let i = 1; i <= 25; i++) {
        students.push({
          _id: new ObjectId(),
          Unique_ID: `STU-SCALE-${i}`,
          First_Name: `Student${i}`,
          Academic_Year: "2018",
          Grade: "አንደኛ ክፍል",
          status: "active",
        });
      }

      const fixture = createMockDbFixture({
        students,
        enrollments: [],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb, {
        batchSize: 5,
        limit: 10,
      });

      expect(report.summary.totalStudentsExamined).toBe(10);
      expect(report.flaggedRecords).toHaveLength(10);
    });
  });

  describe("10. Orphaned enrollments check", () => {
    it("identifies enrollments referencing non-existent student IDs", async () => {
      const orphanStudentId = new ObjectId();

      const fixture = createMockDbFixture({
        students: [], // No students
        enrollments: [
          {
            _id: new ObjectId(),
            studentId: orphanStudentId,
            uniqueId: "ORPHAN-001",
            academicYear: "2018",
            grade: "4",
            status: "active",
          },
        ],
      });

      const report = await reconcileLegacyEnrollments(fixture.mockDb, {
        orphanedCheck: true,
      });

      expect(report.summary.totalOrphanedEnrollments).toBe(1);
      expect(report.orphanedEnrollments[0].studentId).toBe(orphanStudentId.toString());
      expect(report.orphanedEnrollments[0].finding).toContain("does not exist in students collection");
    });
  });

  describe("11. Report formatters and safe file output", () => {
    const sampleReport = {
      metadata: {
        title: "Test Report",
        phase: "Phase 5",
        mode: "READ-ONLY",
        startedAt: "2026-10-10T00:00:00.000Z",
        completedAt: "2026-10-10T00:00:01.000Z",
        academicYearFilter: "2018",
        databaseMutated: false,
      },
      summary: {
        totalStudentsExamined: 2,
        totalStudentsWithEnrollments: 1,
        totalStudentsWithoutEnrollments: 1,
        totalConfirmedMissingEnrollments: 1,
        totalPotentialGaps: 0,
        totalIdentifierMismatches: 0,
        totalDuplicateOrAmbiguousReferences: 0,
        totalOrphanedEnrollments: 0,
        totalRecordsRequiringManualReview: 0,
      },
      flaggedRecords: [
        {
          studentId: "650000000000000000000001",
          uniqueId: "ብሕ/18/01/001",
          studentName: "Daniel Haile",
          academicYear: "2018",
          grade: "አንደኛ ክፍል",
          classification: "Regular",
          lifecycleStatus: "active",
          attendanceCount: 15,
          enrollmentCount: 0,
          enrollmentsFound: [],
          category: "CONFIRMED_MISSING_ENROLLMENT",
          finding: "Active student with 15 attendance marks has zero enrollment records.",
          recommendation: "Candidate for future administrative backfill.",
          requiresManualReview: false,
          verified: true,
        },
      ],
      orphanedEnrollments: [],
    };

    it("formatAsJson generates valid JSON without sensitive PII", () => {
      const jsonStr = formatAsJson(sampleReport);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.summary.totalStudentsExamined).toBe(2);
      expect(parsed.flaggedRecords[0].studentName).toBe("Daniel Haile");
      // Verify no sensitive fields exist
      expect(jsonStr).not.toContain("Phone_Number");
      expect(jsonStr).not.toContain("Mothers_Name");
      expect(jsonStr).not.toContain("photo_data_url");
    });

    it("formatAsCsv generates valid CSV rows", () => {
      const csvStr = formatAsCsv(sampleReport);
      expect(csvStr).toContain("Student ID,Unique ID,Student Name");
      expect(csvStr).toContain('"Daniel Haile"');
      expect(csvStr).toContain("CONFIRMED_MISSING_ENROLLMENT");
    });

    it("formatAsConsole produces formatted human-readable output", () => {
      const consoleStr = formatAsConsole(sampleReport);
      expect(consoleStr).toContain("BIRHANE HIWOT SUNDAY SCHOOL");
      expect(consoleStr).toContain("Total Students Examined            : 2");
      expect(consoleStr).toContain("Daniel Haile");
    });

    it("safelyWriteReportFile prevents overwriting existing files", () => {
      const tmpDir = path.resolve("scratch_test_reports");
      const targetFile = path.join(tmpDir, "audit-report.json");

      try {
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(targetFile, '{"initial":true}', "utf8");

        // Write without allowOverwrite
        const actualWritten = safelyWriteReportFile(targetFile, '{"second":true}', false);

        expect(actualWritten).not.toBe(targetFile);
        expect(fs.existsSync(targetFile)).toBe(true);
        expect(fs.readFileSync(targetFile, "utf8")).toBe('{"initial":true}');
        expect(fs.existsSync(actualWritten)).toBe(true);
      } finally {
        // Cleanup test directory
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe("5. Preflight Configuration Hardening (validatePreflightConfig & auditStudentUniqueIdConstraintsCore)", () => {
    it("fails closed when MONGODB_DB is missing or undefined", () => {
      expect(() => {
        validatePreflightConfig({
          MONGODB_URI: "mongodb://user:pass@localhost:27017",
          MONGODB_DB: undefined,
        });
      }).toThrow(/Missing database target: MONGODB_DB is strictly required/);

      expect(() => {
        validatePreflightConfig({
          MONGODB_URI: "mongodb://user:pass@localhost:27017",
          MONGODB_DB: "",
        });
      }).toThrow(/Missing database target: MONGODB_DB is strictly required/);
    });

    it("fails closed when connection URI is missing", () => {
      expect(() => {
        validatePreflightConfig({
          MONGODB_DB: "sunday_school",
          MONGODB_URI: "",
          MONGODB_READONLY_URI: "",
        });
      }).toThrow(/Missing connection URI: MONGODB_READONLY_URI/);
    });

    it("rejects system and test database names", () => {
      for (const forbidden of ["admin", "local", "config", "test"]) {
        expect(() => {
          validatePreflightConfig({
            MONGODB_URI: "mongodb://user:pass@localhost:27017",
            MONGODB_DB: forbidden,
          });
        }).toThrow(/Forbidden database name/);
      }
    });

    it("rejects invalid database names containing whitespace or illegal characters", () => {
      for (const invalid of ["sunday school", "sunday/school", "sunday\\school", "db.name", "db?name"]) {
        expect(() => {
          validatePreflightConfig({
            MONGODB_URI: "mongodb://user:pass@localhost:27017",
            MONGODB_DB: invalid,
          });
        }).toThrow(/Invalid database name/);
      }
    });

    it("prioritizes MONGODB_READONLY_URI over MONGODB_URI when provided", () => {
      const config = validatePreflightConfig({
        MONGODB_URI: "mongodb://rw-user:rw-pass@localhost:27017",
        MONGODB_READONLY_URI: "mongodb://ro-user:ro-pass@localhost:27017",
        MONGODB_DB: "sunday_school",
      });

      expect(config.uri).toBe("mongodb://ro-user:ro-pass@localhost:27017");
      expect(config.dbName).toBe("sunday_school");
      expect(config.isExplicitReadOnlyUri).toBe(true);
    });

    it("auditStudentUniqueIdConstraintsCore returns compatible: true when no duplicates exist and enforces read-only", async () => {
      const student1 = { _id: new ObjectId(), Unique_ID: "STU-001" };
      const student2 = { _id: new ObjectId(), Unique_ID: "STU-002" };

      const { mockDb, mutationSpy } = createMockDbFixture({
        students: [student1, student2],
      });

      const auditResult = await auditStudentUniqueIdConstraintsCore(mockDb as any);

      expect(auditResult.compatible).toBe(true);
      expect(auditResult.duplicateCount).toBe(0);
      expect(auditResult.emptyOrNullCount).toBe(0);
      expect(mutationSpy).not.toHaveBeenCalled(); // Zero mutating operations
    });

    it("auditStudentUniqueIdConstraintsCore detects duplicates without mutating database", async () => {
      const student1 = { _id: new ObjectId(), Unique_ID: "STU-DUPLICATE" };
      const student2 = { _id: new ObjectId(), Unique_ID: "STU-DUPLICATE" };

      const { mockDb, mutationSpy } = createMockDbFixture({
        students: [student1, student2],
      });

      const auditResult = await auditStudentUniqueIdConstraintsCore(mockDb as any);

      expect(auditResult.compatible).toBe(false);
      expect(auditResult.duplicateCount).toBe(1);
      expect(auditResult.duplicateValues[0].uniqueId).toBe("STU-DUPLICATE");
      expect(auditResult.duplicateValues[0].count).toBe(2);
      expect(mutationSpy).not.toHaveBeenCalled(); // Strictly read-only
    });

    it("createReadOnlyDb traps additional mutating methods (findOneAndUpdate, dropDatabase, etc.)", () => {
      const { mockDb } = createMockDbFixture({});
      const readOnlyDb = createReadOnlyDb(mockDb as any);

      // Collection-level mutating methods
      const collection = (readOnlyDb as any).collection("students");
      expect(() => collection.findOneAndUpdate({ _id: new ObjectId() }, { $set: { status: "active" } })).toThrow(
        /Method "findOneAndUpdate" is forbidden/
      );
      expect(() => collection.findOneAndDelete({ _id: new ObjectId() })).toThrow(
        /Method "findOneAndDelete" is forbidden/
      );
      expect(() => collection.findOneAndReplace({ _id: new ObjectId() }, {})).toThrow(
        /Method "findOneAndReplace" is forbidden/
      );
      expect(() => collection.rename("new_students")).toThrow(
        /Method "rename" is forbidden/
      );

      // Database-level mutating methods
      expect(() => (readOnlyDb as any).dropDatabase()).toThrow(
        /Database-level method "dropDatabase" is forbidden/
      );
      expect(() => (readOnlyDb as any).createCollection("new_col")).toThrow(
        /Database-level method "createCollection" is forbidden/
      );
      expect(() => (readOnlyDb as any).renameCollection("old", "new")).toThrow(
        /Database-level method "renameCollection" is forbidden/
      );
    });

    it("verifyReadOnlyPermissions succeeds when account has read-only role and stops when write roles are present", async () => {
      // 1. Valid read-only user
      const mockReadOnlyDb = {
        command: jest.fn().mockResolvedValue({
          ok: 1,
          authInfo: {
            authenticatedUserRoles: [{ role: "read", db: "sunday_school" }],
          },
        }),
      } as unknown as Db;

      const validResult = await verifyReadOnlyPermissions(mockReadOnlyDb);
      expect(validResult.verified).toBe(true);
      expect(validResult.roles).toHaveLength(1);
      expect(validResult.roles[0].role).toBe("read");

      // 2. User with write role (readWrite) -> must throw and halt
      const mockWriteDb = {
        command: jest.fn().mockResolvedValue({
          ok: 1,
          authInfo: {
            authenticatedUserRoles: [{ role: "readWrite", db: "sunday_school" }],
          },
        }),
      } as unknown as Db;

      await expect(verifyReadOnlyPermissions(mockWriteDb)).rejects.toThrow(
        /Database account possesses write or administrative privileges/
      );

      // 3. User with admin role (atlasAdmin, dbAdmin, root) -> must throw and halt
      const mockAdminDb = {
        command: jest.fn().mockResolvedValue({
          ok: 1,
          authInfo: {
            authenticatedUserRoles: [{ role: "atlasAdmin", db: "admin" }],
          },
        }),
      } as unknown as Db;

      await expect(verifyReadOnlyPermissions(mockAdminDb)).rejects.toThrow(
        /Database account possesses write or administrative privileges/
      );

      // 4. User with 0 roles -> must throw and halt
      const mockNoRoleDb = {
        command: jest.fn().mockResolvedValue({
          ok: 1,
          authInfo: {
            authenticatedUserRoles: [],
          },
        }),
      } as unknown as Db;

      await expect(verifyReadOnlyPermissions(mockNoRoleDb)).rejects.toThrow(
        /connectionStatus returned 0 authenticated user roles/
      );

      // 5. connectionStatus failure -> must throw and halt
      const mockFailedDb = {
        command: jest.fn().mockRejectedValue(new Error("Command failed: unauthorized")),
      } as unknown as Db;

      await expect(verifyReadOnlyPermissions(mockFailedDb)).rejects.toThrow(
        /Unable to verify database permissions via connectionStatus command/
      );
    });
  });
});
