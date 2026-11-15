import type { Db } from "mongodb";

export interface StudentUniqueIdAuditResult {
  compatible: boolean;
  duplicateCount: number;
  duplicateValues: Array<{ uniqueId: string; count: number; studentIds: string[] }>;
  emptyOrNullCount: number;
  reason?: string;
}

/**
 * Preflight audit of existing student documents before creating the unique sparse index.
 * Checks for duplicate non-empty Unique_ID values and incompatible null/empty values.
 */
export async function auditStudentUniqueIdConstraints(db: Db): Promise<StudentUniqueIdAuditResult> {
  const collection = db.collection("students");

  // 1. Group by trimmed non-empty Unique_ID to detect duplicates
  const duplicatePipeline = [
    {
      $match: {
        Unique_ID: { $exists: true, $type: "string", $nin: ["", null] },
      },
    },
    {
      $group: {
        _id: { $trim: { input: "$Unique_ID" } },
        count: { $sum: 1 },
        studentIds: { $push: { $toString: "$_id" } },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
        _id: { $ne: "" },
      },
    },
  ];

  const duplicateDocs = await collection.aggregate(duplicatePipeline).toArray();

  // 2. Count explicit null or whitespace/empty string Unique_IDs
  const emptyOrNullDocs = await collection
    .find({
      $or: [
        { Unique_ID: null },
        { Unique_ID: "" },
        { Unique_ID: { $regex: /^\s+$/ } },
      ],
    })
    .toArray();

  const duplicateValues = duplicateDocs.map((d: any) => ({
    uniqueId: String(d._id),
    count: Number(d.count),
    studentIds: (d.studentIds || []).map(String),
  }));

  const duplicateCount = duplicateValues.length;
  const emptyOrNullCount = emptyOrNullDocs.length;

  if (duplicateCount > 0) {
    return {
      compatible: false,
      duplicateCount,
      duplicateValues,
      emptyOrNullCount,
      reason: `Found ${duplicateCount} duplicate Unique_ID value(s) across existing student records.`,
    };
  }

  // A sparse index in MongoDB does NOT index documents missing the field, but it DOES index explicit null or empty string.
  // Therefore, more than 1 document with null or empty string would collide.
  if (emptyOrNullCount > 1) {
    return {
      compatible: false,
      duplicateCount: 0,
      duplicateValues: [],
      emptyOrNullCount,
      reason: `Found ${emptyOrNullCount} student documents with null or empty Unique_ID, which would collide on sparse unique index.`,
    };
  }

  return {
    compatible: true,
    duplicateCount: 0,
    duplicateValues: [],
    emptyOrNullCount,
  };
}

/**
 * Ensures unique sparse index on students.Unique_ID with preflight safety checks.
 */
export async function ensureStudentUniqueIdIndex(
  db: Db,
): Promise<{ created: boolean; audit: StudentUniqueIdAuditResult }> {
  const audit = await auditStudentUniqueIdConstraints(db);
  if (!audit.compatible) {
    const errorMsg = `[mongoIndexes] Preflight check failed for students.Unique_ID unique sparse index: ${audit.reason}`;
    console.error(errorMsg, JSON.stringify(audit.duplicateValues));
    throw new Error(errorMsg);
  }

  try {
    await db.collection("students").createIndexes([
      {
        key: { Unique_ID: 1 },
        unique: true,
        sparse: true,
        name: "idx_students_uniqueId_sparse_unique",
      },
    ]);
    return { created: true, audit };
  } catch (err: any) {
    console.error("[mongoIndexes] Failed to create idx_students_uniqueId_sparse_unique:", err?.message || err);
    throw err;
  }
}

export async function ensureCoreMongoIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("enrollments").createIndexes([
      { key: { studentId: 1 }, name: "idx_enrollments_studentId" },
      { key: { academicYear: 1 }, name: "idx_enrollments_academicYear" },
      { key: { classification: 1 }, name: "idx_enrollments_classification" },
      { key: { grade: 1 }, name: "idx_enrollments_grade" },
      { key: { uniqueId: 1 }, unique: true, name: "idx_enrollments_uniqueId_unique" },
      { key: { status: 1 }, name: "idx_enrollments_status" },
      { key: { isCurrent: 1 }, name: "idx_enrollments_isCurrent" },
      {
        key: { studentId: 1, academicYear: 1, classification: 1, grade: 1 },
        name: "idx_enrollments_student_academic_grade",
      },
      {
        key: { academicYear: 1, classification: 1, grade: 1, section: 1 },
        name: "idx_enrollments_academic_grade_section",
      },
    ]),
    db.collection("promotion_decisions").createIndexes([
      { key: { studentId: 1 }, name: "idx_promotion_decisions_studentId" },
      { key: { fromEnrollmentId: 1 }, name: "idx_promotion_decisions_fromEnrollmentId" },
      { key: { academicYear: 1 }, name: "idx_promotion_decisions_academicYear" },
      { key: { status: 1 }, name: "idx_promotion_decisions_status" },
      { key: { decisionType: 1 }, name: "idx_promotion_decisions_decisionType" },
    ]),
    db.collection("promotion_policies").createIndexes([
      { key: { classification: 1, active: 1 }, name: "idx_promotion_policies_classification_active" },
      { key: { effectiveFrom: 1, active: 1 }, name: "idx_promotion_policies_effectiveFrom_active" },
    ]),
  ]);
}
