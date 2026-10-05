import type { Db } from "mongodb";

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
