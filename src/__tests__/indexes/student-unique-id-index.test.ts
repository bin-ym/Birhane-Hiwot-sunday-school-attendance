/**
 * @jest-environment node
 */
import { Db, ObjectId } from "mongodb";
import {
  auditStudentUniqueIdConstraints,
  ensureStudentUniqueIdIndex,
  ensureCoreMongoIndexes,
} from "@/lib/mongoIndexes";

describe("Phase 4 — Database Index Hardening: students.Unique_ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Preflight Audit Constraints (auditStudentUniqueIdConstraints)", () => {
    it("returns compatible: true when all student records have distinct, non-empty Unique_IDs", async () => {
      const mockStudents = [
        { _id: new ObjectId(), Unique_ID: "STU-001" },
        { _id: new ObjectId(), Unique_ID: "STU-002" },
        { _id: new ObjectId(), Unique_ID: "STU-003" },
      ];

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [], // No duplicates found
              }),
              find: () => ({
                toArray: async () => [], // No empty/null found
              }),
            };
          }
          return {};
        },
      } as unknown as Db;

      const result = await auditStudentUniqueIdConstraints(mockDb);

      expect(result.compatible).toBe(true);
      expect(result.duplicateCount).toBe(0);
      expect(result.duplicateValues).toHaveLength(0);
      expect(result.emptyOrNullCount).toBe(0);
    });

    it("detects duplicate non-empty Unique_ID values and returns compatible: false with duplicate details", async () => {
      const s1 = new ObjectId();
      const s2 = new ObjectId();

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [
                  {
                    _id: "STU-DUP-001",
                    count: 2,
                    studentIds: [s1.toString(), s2.toString()],
                  },
                ],
              }),
              find: () => ({
                toArray: async () => [],
              }),
            };
          }
          return {};
        },
      } as unknown as Db;

      const result = await auditStudentUniqueIdConstraints(mockDb);

      expect(result.compatible).toBe(false);
      expect(result.duplicateCount).toBe(1);
      expect(result.duplicateValues).toEqual([
        {
          uniqueId: "STU-DUP-001",
          count: 2,
          studentIds: [s1.toString(), s2.toString()],
        },
      ]);
      expect(result.reason).toContain("Found 1 duplicate Unique_ID value(s)");
    });

    it("detects multiple null or empty Unique_ID documents and returns compatible: false", async () => {
      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [],
              }),
              find: () => ({
                toArray: async () => [
                  { _id: new ObjectId(), Unique_ID: null },
                  { _id: new ObjectId(), Unique_ID: "" },
                ],
              }),
            };
          }
          return {};
        },
      } as unknown as Db;

      const result = await auditStudentUniqueIdConstraints(mockDb);

      expect(result.compatible).toBe(false);
      expect(result.emptyOrNullCount).toBe(2);
      expect(result.reason).toContain("student documents with null or empty Unique_ID");
    });
  });

  describe("2. Index Creation and Preflight Enforcement (ensureStudentUniqueIdIndex)", () => {
    it("creates unique sparse index with exact definition when audit passes", async () => {
      const createIndexesMock = jest.fn().mockResolvedValue(["idx_students_uniqueId_sparse_unique"]);

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [],
              }),
              find: () => ({
                toArray: async () => [],
              }),
              createIndexes: createIndexesMock,
            };
          }
          return {};
        },
      } as unknown as Db;

      const res = await ensureStudentUniqueIdIndex(mockDb);

      expect(res.created).toBe(true);
      expect(createIndexesMock).toHaveBeenCalledTimes(1);
      expect(createIndexesMock).toHaveBeenCalledWith([
        {
          key: { Unique_ID: 1 },
          unique: true,
          sparse: true,
          name: "idx_students_uniqueId_sparse_unique",
        },
      ]);
    });

    it("halts index creation and throws error when audit detects duplicates", async () => {
      const createIndexesMock = jest.fn();

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [
                  {
                    _id: "STU-CONFLICT",
                    count: 3,
                    studentIds: ["id1", "id2", "id3"],
                  },
                ],
              }),
              find: () => ({
                toArray: async () => [],
              }),
              createIndexes: createIndexesMock,
            };
          }
          return {};
        },
      } as unknown as Db;

      await expect(ensureStudentUniqueIdIndex(mockDb)).rejects.toThrow(
        "Preflight check failed for students.Unique_ID unique sparse index",
      );

      // Must NOT attempt to call createIndexes
      expect(createIndexesMock).not.toHaveBeenCalled();
    });

    it("propagates and logs MongoDB createIndexes errors if index creation fails", async () => {
      const createIndexesMock = jest.fn().mockRejectedValue(
        new Error("Index build failed: duplicate key error"),
      );

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [],
              }),
              find: () => ({
                toArray: async () => [],
              }),
              createIndexes: createIndexesMock,
            };
          }
          return {};
        },
      } as unknown as Db;

      await expect(ensureStudentUniqueIdIndex(mockDb)).rejects.toThrow(
        "Index build failed: duplicate key error",
      );
    });
  });

  describe("3. Core Index Orchestration Decoupling (ensureCoreMongoIndexes)", () => {
    it("ensures normal core index initialization does NOT create the Phase 4 students.Unique_ID index", async () => {
      const studentsCreateIndexes = jest.fn().mockResolvedValue([]);
      const enrollmentsCreateIndexes = jest.fn().mockResolvedValue([]);
      const decisionsCreateIndexes = jest.fn().mockResolvedValue([]);
      const policiesCreateIndexes = jest.fn().mockResolvedValue([]);

      const mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({ toArray: async () => [] }),
              find: () => ({ toArray: async () => [] }),
              createIndexes: studentsCreateIndexes,
            };
          }
          if (name === "enrollments") {
            return { createIndexes: enrollmentsCreateIndexes };
          }
          if (name === "promotion_decisions") {
            return { createIndexes: decisionsCreateIndexes };
          }
          if (name === "promotion_policies") {
            return { createIndexes: policiesCreateIndexes };
          }
          return {};
        },
      } as unknown as Db;

      await ensureCoreMongoIndexes(mockDb);

      // Core indexes created
      expect(enrollmentsCreateIndexes).toHaveBeenCalled();
      expect(decisionsCreateIndexes).toHaveBeenCalled();
      expect(policiesCreateIndexes).toHaveBeenCalled();

      // Phase 4 students.Unique_ID index is DECOUPLED: must NOT be called during normal initialization
      expect(studentsCreateIndexes).not.toHaveBeenCalled();
    });

    it("ensures normal core index initialization succeeds even if duplicate Unique_IDs exist in database", async () => {
      const enrollmentsCreateIndexes = jest.fn().mockResolvedValue([]);
      const decisionsCreateIndexes = jest.fn().mockResolvedValue([]);
      const policiesCreateIndexes = jest.fn().mockResolvedValue([]);

      // Mock database where duplicate Unique_IDs exist in students
      const mockDbWithDuplicates = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              aggregate: () => ({
                toArray: async () => [{ _id: "STU-CONFLICT", count: 2, studentIds: ["id1", "id2"] }],
              }),
              find: () => ({ toArray: async () => [] }),
              createIndexes: jest.fn(),
            };
          }
          if (name === "enrollments") {
            return { createIndexes: enrollmentsCreateIndexes };
          }
          if (name === "promotion_decisions") {
            return { createIndexes: decisionsCreateIndexes };
          }
          if (name === "promotion_policies") {
            return { createIndexes: policiesCreateIndexes };
          }
          return {};
        },
      } as unknown as Db;

      // Normal core index initialization must NOT crash or throw on duplicate students
      await expect(ensureCoreMongoIndexes(mockDbWithDuplicates)).resolves.not.toThrow();
      expect(enrollmentsCreateIndexes).toHaveBeenCalled();
    });
  });
});
