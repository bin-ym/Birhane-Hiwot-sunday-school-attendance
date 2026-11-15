#!/usr/bin/env node
/**
 * scripts/reconcile-legacy-enrollments.mjs
 *
 * Task 12 — Phase 5: Legacy Enrollment Reconciliation (Read-Only)
 * Birhane Hiwot Sunday School Attendance System
 *
 * Mode: READ-ONLY data-integrity audit and report generation.
 *
 * Objectives:
 * 1. Read existing student, enrollment, and attendance records.
 * 2. Identify students with no corresponding enrollment records (e.g., from seed-from-excel.mjs).
 * 3. Resolve student references by canonical MongoDB _id and school-facing Unique_ID.
 * 4. Detect duplicate Unique_ID references and identifier mismatches.
 * 5. Distinguish confirmed missing enrollments from potential gaps requiring manual review.
 * 6. Generate sanitized reports (JSON / CSV / console) protecting sensitive PII.
 * 7. ZERO mutations: strictly read-only, no inserts, updates, deletes, or index changes.
 *
 * Usage:
 *   node scripts/reconcile-legacy-enrollments.mjs [options]
 *
 * Options:
 *   --output <path>        Path to write report (JSON or CSV). If omitted, prints to stdout.
 *   --format <json|csv>    Report file format (default: inferred from output extension or "json").
 *   --year <academicYear>  Filter students by academic year (e.g., --year 2018).
 *   --limit <number>       Limit the number of student documents examined.
 *   --batch-size <number>  Cursor batch size (default: 200).
 *   --no-orphans           Skip scanning for orphaned enrollment documents.
 *   --overwrite            Allow overwriting output file if it already exists.
 *   --help                 Display this help message.
 */

import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

// Configure fallback DNS resolvers to ensure robust SRV resolution on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", ...dns.getServers()]);
} catch {
  // Continue with default resolver if setting servers is not permitted
}

// Load environment variables (.env.local first, fallback to .env)
dotenv.config({ path: ".env.local" });
if (!process.env.MONGODB_URI && !process.env.MONGODB_READONLY_URI) {
  dotenv.config({ path: ".env" });
}

/* --------------------------- Read-Only DB Guard --------------------------- */

const MUTATING_METHODS = new Set([
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "bulkWrite",
  "drop",
  "dropIndex",
  "dropIndexes",
  "createIndex",
  "createIndexes",
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "rename",
]);

const DB_MUTATING_METHODS = new Set([
  "dropDatabase",
  "createCollection",
  "renameCollection",
]);

/**
 * Wraps a MongoDB Db instance in a Proxy that throws on any mutating operation.
 * Guarantees read-only behavior at the driver call level.
 */
export function createReadOnlyDb(db) {
  return new Proxy(db, {
    get(targetDb, dbProp, receiver) {
      if (DB_MUTATING_METHODS.has(String(dbProp))) {
        throw new Error(
          `[READ-ONLY VIOLATION] Database-level method "${String(dbProp)}" is forbidden. ` +
            `Audit and reconciliation operations are strictly READ-ONLY.`
        );
      }
      if (dbProp === "collection") {
        return (name, colOptions) => {
          const col = targetDb.collection(name, colOptions);
          return new Proxy(col, {
            get(targetCol, colProp) {
              if (MUTATING_METHODS.has(String(colProp))) {
                throw new Error(
                  `[READ-ONLY VIOLATION] Method "${String(colProp)}" is forbidden on collection "${name}". ` +
                    `Audit and reconciliation operations are strictly READ-ONLY.`
                );
              }
              return Reflect.get(targetCol, colProp);
            },
          });
        };
      }
      return Reflect.get(targetDb, dbProp, receiver);
    },
  });
}

/**
 * Verifies that the connected database account has strictly read-only permissions
 * and no write or administrative privileges, stopping before collection scans.
 *
 * @param {import("mongodb").Db} db
 * @returns {Promise<{ verified: boolean; roles: Array<{ role: string; db: string }> }>}
 */
export async function verifyReadOnlyPermissions(db) {
  let connStatus;
  try {
    connStatus = await db.command({ connectionStatus: 1, showPrivileges: true });
  } catch (err) {
    throw new Error(
      `[SECURITY STOP] Unable to verify database permissions via connectionStatus command: ${err.message}. ` +
        `Execution stopped before collection scans.`
    );
  }

  const roles = connStatus?.authInfo?.authenticatedUserRoles || [];
  const writeRoles = new Set([
    "readWrite",
    "readWriteAnyDatabase",
    "dbAdmin",
    "dbAdminAnyDatabase",
    "userAdmin",
    "userAdminAnyDatabase",
    "clusterAdmin",
    "root",
    "atlasAdmin",
    "dbOwner",
  ]);

  const detectedWriteRoles = roles.filter((r) => writeRoles.has(r.role));
  if (detectedWriteRoles.length > 0) {
    const roleList = detectedWriteRoles.map((r) => `${r.role}@${r.db}`).join(", ");
    throw new Error(
      `[SECURITY STOP] Database account possesses write or administrative privileges (${roleList}). ` +
        `Production preflight requires a strictly read-only account. Execution halted before collection scans.`
    );
  }

  if (roles.length === 0) {
    throw new Error(
      `[SECURITY STOP] connectionStatus returned 0 authenticated user roles. ` +
        `Cannot confirm database-level read-only permissions. Execution halted before collection scans.`
    );
  }

  const hasReadOnlyRole = roles.some((r) => ["read", "readAnyDatabase"].includes(r.role));
  if (!hasReadOnlyRole) {
    const roleList = roles.map((r) => `${r.role}@${r.db}`).join(", ");
    throw new Error(
      `[SECURITY STOP] Database account does not have a recognized read-only role (${roleList}). ` +
        `Expected role 'read' on the target database or 'readAnyDatabase'. Execution halted before collection scans.`
    );
  }

  return { verified: true, roles };
}

/* -------------------------- Reconciliation Engine ------------------------- */

/**
 * Core reconciliation audit logic.
 *
 * @param {import("mongodb").Db} rawDb - Connected MongoDB Db instance.
 * @param {object} [options]
 * @param {string} [options.academicYear] - Filter students by Academic_Year.
 * @param {number} [options.batchSize=200] - Cursor batch size.
 * @param {number} [options.limit] - Max students to examine.
 * @param {boolean} [options.orphanedCheck=true] - Whether to audit for orphaned enrollments.
 * @param {Function} [options.onProgress] - Optional progress callback ({ examined, total }).
 * @returns {Promise<ReconciliationReport>}
 */
export async function reconcileLegacyEnrollments(rawDb, options = {}) {
  const db = createReadOnlyDb(rawDb);
  const studentsCol = db.collection("students");
  const enrollmentsCol = db.collection("enrollments");
  const attendanceCol = db.collection("attendance");

  const startTime = new Date().toISOString();
  const batchSize = Number(options.batchSize) || 200;
  const targetYear = options.academicYear ? String(options.academicYear).trim() : null;

  // 1. Pre-audit: Identify duplicate Unique_IDs across students collection
  const dupAgg = [
    {
      $match: {
        Unique_ID: { $exists: true, $ne: null, $nin: ["", " "] },
      },
    },
    {
      $group: {
        _id: { $trim: { input: "$Unique_ID" } },
        count: { $sum: 1 },
        studentIds: { $push: "$_id" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ];

  const duplicateGroups = await studentsCol.aggregate(dupAgg).toArray();
  const duplicateUniqueIdMap = new Map();
  for (const group of duplicateGroups) {
    duplicateUniqueIdMap.set(group._id, {
      count: group.count,
      studentIds: group.studentIds.map((id) => id.toString()),
    });
  }

  // 2. Query students matching filter
  const studentFilter = {};
  if (targetYear) {
    studentFilter.Academic_Year = targetYear;
  }

  const totalStudentsToExamine = await studentsCol.countDocuments(studentFilter);
  let studentCursor = studentsCol
    .find(studentFilter, {
      projection: {
        _id: 1,
        Unique_ID: 1,
        First_Name: 1,
        Father_Name: 1,
        Academic_Year: 1,
        Grade: 1,
        Class: 1,
        Classification: 1,
        status: 1,
      },
    })
    .sort({ _id: 1 })
    .batchSize(batchSize);

  if (options.limit && options.limit > 0) {
    studentCursor = studentCursor.limit(options.limit);
  }

  // 3. Process students
  let totalExamined = 0;
  let totalWithEnrollments = 0;
  let totalWithoutEnrollments = 0;
  let totalConfirmedMissing = 0;
  let totalPotentialGaps = 0;
  let totalIdentifierMismatches = 0;
  let totalDuplicateReferences = 0;
  let totalRequiringReview = 0;

  const flaggedRecords = [];

  while (await studentCursor.hasNext()) {
    const s = await studentCursor.next();
    if (!s) break;
    totalExamined++;

    const sId = s._id;
    const sIdStr = sId.toString();
    const uniqueId = typeof s.Unique_ID === "string" ? s.Unique_ID.trim() : null;
    const studentName = [s.First_Name, s.Father_Name].filter(Boolean).join(" ") || "Unnamed";
    const academicYear = s.Academic_Year ? String(s.Academic_Year).trim() : null;
    const grade = s.Grade ? String(s.Grade).trim() : null;
    const classification = s.Classification || s.Class || null;
    const lifecycleStatus = s.status || "unspecified";

    // Dual-identifier lookup in enrollments collection
    const enrollmentOrConditions = [
      { studentId: sId },
      { studentId: sIdStr },
    ];
    if (uniqueId) {
      enrollmentOrConditions.push({ uniqueId });
    }

    const matchingEnrollments = await enrollmentsCol
      .find(
        { $or: enrollmentOrConditions },
        {
          projection: {
            _id: 1,
            studentId: 1,
            uniqueId: 1,
            academicYear: 1,
            grade: 1,
            classification: 1,
            status: 1,
            isCurrent: 1,
          },
        }
      )
      .toArray();

    // Cross-reference attendance records (by Mongo ID or Unique_ID)
    const attendanceOrConditions = [
      { studentId: sIdStr },
      { studentId: sId },
    ];
    if (uniqueId) {
      attendanceOrConditions.push({ studentId: uniqueId });
    }
    const attendanceCount = await attendanceCol.countDocuments({
      $or: attendanceOrConditions,
    });

    // Analyze identifier consistency across found enrollments
    let hasIdentifierMismatch = false;
    const mismatchDetails = [];

    for (const enr of matchingEnrollments) {
      const enrStudentIdStr = enr.studentId ? enr.studentId.toString() : null;
      const enrUniqueId = typeof enr.uniqueId === "string" ? enr.uniqueId.trim() : null;

      if (enrStudentIdStr && enrStudentIdStr !== sIdStr) {
        hasIdentifierMismatch = true;
        mismatchDetails.push(
          `Enrollment studentId "${enrStudentIdStr}" does not match Student._id "${sIdStr}"`
        );
      }
      if (uniqueId && enrUniqueId && enrUniqueId !== uniqueId) {
        hasIdentifierMismatch = true;
        mismatchDetails.push(
          `Enrollment uniqueId "${enrUniqueId}" does not match Student.Unique_ID "${uniqueId}"`
        );
      }
    }

    const isDuplicateUniqueId = uniqueId && duplicateUniqueIdMap.has(uniqueId);

    // Classification logic
    let category = "ENROLLED_MATCHED";
    let finding = "";
    let recommendation = "";
    let requiresManualReview = false;
    let verified = true;

    if (isDuplicateUniqueId) {
      const dup = duplicateUniqueIdMap.get(uniqueId);
      category = "DUPLICATE_OR_AMBIGUOUS_REFERENCE";
      finding = `Unique_ID "${uniqueId}" is shared by ${dup.count} student documents (${dup.studentIds.join(", ")}).`;
      recommendation = "Manual review required: Disambiguate student records and assign unique identifiers before enrollment changes.";
      requiresManualReview = true;
      verified = false;
      totalDuplicateReferences++;
    } else if (hasIdentifierMismatch) {
      category = "IDENTIFIER_MISMATCH";
      finding = `Identifier mismatch detected: ${mismatchDetails.join("; ")}.`;
      recommendation = "Manual review required: Verify student identity and reconcile mismatched studentId / uniqueId references.";
      requiresManualReview = true;
      verified = false;
      totalIdentifierMismatches++;
    } else if (matchingEnrollments.length > 0) {
      category = "ENROLLED_MATCHED";
      finding = `Student has ${matchingEnrollments.length} matching enrollment record(s).`;
      recommendation = "No action required: Enrollment record exists and matches student identity.";
      requiresManualReview = false;
      verified = true;
      totalWithEnrollments++;
    } else {
      // Zero enrollments found
      totalWithoutEnrollments++;
      const isActiveLifecycle = lifecycleStatus === "active";
      const hasAttendanceActivity = attendanceCount > 0;
      const hasCompleteAcademicMeta = Boolean(academicYear && grade);

      if (isActiveLifecycle || hasAttendanceActivity || hasCompleteAcademicMeta) {
        category = "CONFIRMED_MISSING_ENROLLMENT";
        finding = `Active or attending student (${attendanceCount} attendance mark(s), status: "${lifecycleStatus}", year: "${academicYear || "unspecified"}", grade: "${grade || "unspecified"}") has zero enrollment records in enrollments collection.`;
        recommendation = `Candidate for future administrative backfill with academicYear: "${academicYear || "pending"}", grade: "${grade || "pending"}", classification: "${classification || "Regular"}".`;
        requiresManualReview = !hasCompleteAcademicMeta;
        verified = true;
        totalConfirmedMissing++;
      } else {
        category = "POTENTIAL_GAP_INCOMPLETE_DATA";
        finding = `Historical student record with 0 enrollments, 0 attendance marks, and inactive or unspecified status ("${lifecycleStatus}"). Enrollment requirement cannot be conclusively established from source data.`;
        recommendation = "Manual review required: Verify with Sunday School administration whether student was ever actively enrolled.";
        requiresManualReview = true;
        verified = false;
        totalPotentialGaps++;
      }
    }

    if (requiresManualReview) {
      totalRequiringReview++;
    }

    // Flag records that are not clean-matched
    if (category !== "ENROLLED_MATCHED") {
      flaggedRecords.push({
        studentId: sIdStr,
        uniqueId: uniqueId || "N/A",
        studentName,
        academicYear: academicYear || "N/A",
        grade: grade || "N/A",
        classification: classification || "N/A",
        lifecycleStatus,
        attendanceCount,
        enrollmentCount: matchingEnrollments.length,
        enrollmentsFound: matchingEnrollments.map((e) => ({
          enrollmentId: e._id.toString(),
          studentId: e.studentId ? e.studentId.toString() : null,
          uniqueId: e.uniqueId || null,
          academicYear: e.academicYear,
          grade: e.grade,
          status: e.status,
          isCurrent: e.isCurrent,
        })),
        category,
        finding,
        recommendation,
        requiresManualReview,
        verified,
      });
    }

    if (typeof options.onProgress === "function" && totalExamined % 50 === 0) {
      options.onProgress({
        examined: totalExamined,
        total: totalStudentsToExamine,
      });
    }
  }

  // 4. Audit orphaned enrollment records (enrollments referencing non-existent students)
  const orphanedEnrollments = [];
  if (options.orphanedCheck !== false) {
    const orphanAgg = [
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "matchedStudent",
        },
      },
      {
        $match: {
          matchedStudent: { $size: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          studentId: 1,
          uniqueId: 1,
          academicYear: 1,
          grade: 1,
          status: 1,
        },
      },
      { $limit: 200 },
    ];

    const orphanDocs = await enrollmentsCol.aggregate(orphanAgg).toArray();
    for (const doc of orphanDocs) {
      orphanedEnrollments.push({
        enrollmentId: doc._id.toString(),
        studentId: doc.studentId ? doc.studentId.toString() : "N/A",
        uniqueId: doc.uniqueId || "N/A",
        academicYear: doc.academicYear || "N/A",
        grade: doc.grade || "N/A",
        status: doc.status || "N/A",
        finding: `Enrollment references studentId "${doc.studentId}" which does not exist in students collection.`,
        recommendation: "Manual review required: Verify whether student was deleted or if reference is corrupted.",
        requiresManualReview: true,
        verified: false,
      });
      totalRequiringReview++;
    }
  }

  const endTime = new Date().toISOString();

  return {
    metadata: {
      title: "Birhane Hiwot Sunday School — Legacy Enrollment Reconciliation Audit",
      phase: "Phase 5 (Legacy Enrollment Reconciliation)",
      mode: "READ-ONLY",
      startedAt: startTime,
      completedAt: endTime,
      academicYearFilter: targetYear,
      databaseMutated: false,
    },
    summary: {
      totalStudentsExamined: totalExamined,
      totalStudentsWithEnrollments: totalWithEnrollments,
      totalStudentsWithoutEnrollments: totalWithoutEnrollments,
      totalConfirmedMissingEnrollments: totalConfirmedMissing,
      totalPotentialGaps: totalPotentialGaps,
      totalIdentifierMismatches: totalIdentifierMismatches,
      totalDuplicateOrAmbiguousReferences: totalDuplicateReferences,
      totalOrphanedEnrollments: orphanedEnrollments.length,
      totalRecordsRequiringManualReview: totalRequiringReview,
    },
    flaggedRecords,
    orphanedEnrollments,
  };
}

/* -------------------------- Report Formatters ----------------------------- */

/**
 * Formats reconciliation results as structured JSON.
 */
export function formatAsJson(report) {
  return JSON.stringify(report, null, 2);
}

/**
 * Formats reconciliation results as CSV.
 * Sensitive PII is intentionally excluded.
 */
export function formatAsCsv(report) {
  const headers = [
    "Student ID",
    "Unique ID",
    "Student Name",
    "Academic Year",
    "Grade",
    "Classification",
    "Lifecycle Status",
    "Attendance Count",
    "Enrollment Count",
    "Category",
    "Finding",
    "Recommendation",
    "Requires Manual Review",
    "Verified",
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = [headers.join(",")];

  for (const r of report.flaggedRecords) {
    rows.push(
      [
        escapeCsv(r.studentId),
        escapeCsv(r.uniqueId),
        escapeCsv(r.studentName),
        escapeCsv(r.academicYear),
        escapeCsv(r.grade),
        escapeCsv(r.classification),
        escapeCsv(r.lifecycleStatus),
        r.attendanceCount,
        r.enrollmentCount,
        escapeCsv(r.category),
        escapeCsv(r.finding),
        escapeCsv(r.recommendation),
        r.requiresManualReview ? "YES" : "NO",
        r.verified ? "YES" : "NO",
      ].join(",")
    );
  }

  if (report.orphanedEnrollments && report.orphanedEnrollments.length > 0) {
    for (const o of report.orphanedEnrollments) {
      rows.push(
        [
          escapeCsv(o.studentId),
          escapeCsv(o.uniqueId),
          escapeCsv("[ORPHANED ENROLLMENT]"),
          escapeCsv(o.academicYear),
          escapeCsv(o.grade),
          escapeCsv("N/A"),
          escapeCsv(o.status),
          0,
          1,
          escapeCsv("ORPHANED_ENROLLMENT"),
          escapeCsv(o.finding),
          escapeCsv(o.recommendation),
          "YES",
          "NO",
        ].join(",")
      );
    }
  }

  return rows.join("\n");
}

/**
 * Formats reconciliation results as a human-readable CLI summary.
 */
export function formatAsConsole(report) {
  const { metadata, summary, flaggedRecords, orphanedEnrollments } = report;
  const lines = [];

  lines.push("");
  lines.push("================================================================================");
  lines.push("  BIRHANE HIWOT SUNDAY SCHOOL — LEGACY ENROLLMENT RECONCILIATION AUDIT (PHASE 5)");
  lines.push("  MODE: STRICTLY READ-ONLY | ZERO DATABASE WRITES");
  lines.push("================================================================================");
  lines.push(`  Execution Timestamp : ${metadata.startedAt}`);
  lines.push(`  Academic Year Filter: ${metadata.academicYearFilter || "ALL"}`);
  lines.push(`  Database Mutated    : NO (${metadata.databaseMutated ? "MUTATION DETECTED" : "GUARANTEED READ-ONLY"})`);
  lines.push("--------------------------------------------------------------------------------");
  lines.push("  AUDIT SUMMARY METRICS:");
  lines.push(`    • Total Students Examined            : ${summary.totalStudentsExamined}`);
  lines.push(`    • Students With Enrollments          : ${summary.totalStudentsWithEnrollments}`);
  lines.push(`    • Students Without Enrollments       : ${summary.totalStudentsWithoutEnrollments}`);
  lines.push(`    • Confirmed Missing Enrollments      : ${summary.totalConfirmedMissingEnrollments}`);
  lines.push(`    • Potential Gaps (Incomplete Data)   : ${summary.totalPotentialGaps}`);
  lines.push(`    • Identifier Mismatches              : ${summary.totalIdentifierMismatches}`);
  lines.push(`    • Duplicate Unique_ID References     : ${summary.totalDuplicateOrAmbiguousReferences}`);
  lines.push(`    • Orphaned Enrollment Records        : ${summary.totalOrphanedEnrollments}`);
  lines.push(`    • Total Records Requiring Review     : ${summary.totalRecordsRequiringManualReview}`);
  lines.push("--------------------------------------------------------------------------------");

  if (flaggedRecords.length === 0 && orphanedEnrollments.length === 0) {
    lines.push("  All examined student and enrollment records match expected integrity criteria.");
    lines.push("  No gaps, identifier mismatches, or duplicate references found.");
  } else {
    lines.push(`  FLAGGED RECORDS FOR ADMINISTRATOR REVIEW (${flaggedRecords.length} students):`);
    lines.push("");

    const displayLimit = Math.min(flaggedRecords.length, 15);
    for (let i = 0; i < displayLimit; i++) {
      const r = flaggedRecords[i];
      lines.push(`  [#${i + 1}] Category: ${r.category} | Review Required: ${r.requiresManualReview ? "YES" : "NO"}`);
      lines.push(`      Student ID: ${r.studentId} | Unique ID: ${r.uniqueId} | Name: ${r.studentName}`);
      lines.push(`      Academic Year: ${r.academicYear} | Grade: ${r.grade} | Status: ${r.lifecycleStatus} | Attendance: ${r.attendanceCount}`);
      lines.push(`      Finding: ${r.finding}`);
      lines.push(`      Recommendation: ${r.recommendation}`);
      lines.push("");
    }

    if (flaggedRecords.length > displayLimit) {
      lines.push(`  ... and ${flaggedRecords.length - displayLimit} more flagged records (see exported report).`);
      lines.push("");
    }

    if (orphanedEnrollments.length > 0) {
      lines.push(`  ORPHANED ENROLLMENTS (${orphanedEnrollments.length} records):`);
      for (const o of orphanedEnrollments.slice(0, 5)) {
        lines.push(`    - Enrollment ID: ${o.enrollmentId} | Missing Student ID: ${o.studentId} | Year: ${o.academicYear}`);
      }
      if (orphanedEnrollments.length > 5) {
        lines.push(`    ... and ${orphanedEnrollments.length - 5} more orphaned enrollments.`);
      }
      lines.push("");
    }
  }

  lines.push("================================================================================");
  lines.push("  END OF RECONCILIATION AUDIT (NO DATABASE RECORDS MODIFIED)");
  lines.push("================================================================================");
  lines.push("");

  return lines.join("\n");
}

/* ----------------------------- Safe File Export --------------------------- */

/**
 * Safely saves the report file, preventing accidental overwrites.
 *
 * @param {string} targetPath - Proposed file path.
 * @param {string} content - Report string content.
 * @param {boolean} allowOverwrite - If false, appends timestamp if file exists.
 * @returns {string} The actual written file path.
 */
export function safelyWriteReportFile(targetPath, content, allowOverwrite = false) {
  let resolvedPath = path.resolve(targetPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(resolvedPath) && !allowOverwrite) {
    const ext = path.extname(resolvedPath);
    const base = path.basename(resolvedPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    resolvedPath = path.join(dir, `${base}-${timestamp}${ext}`);
  }

  fs.writeFileSync(resolvedPath, content, "utf8");
  return resolvedPath;
}

/* ----------------------- Preflight Config Validator ----------------------- */

/**
 * Validates preflight configuration prior to attempting any network connection.
 * Fail-closed policy:
 * - Requires MONGODB_READONLY_URI (preferred for preflight) or MONGODB_URI.
 * - Requires explicit MONGODB_DB (never defaults, rejects TEST_MONGODB_DB fallback).
 * - Rejects system databases (admin, local, config) and test databases.
 * - Rejects invalid database names containing whitespace or illegal characters.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ uri: string, dbName: string, isExplicitReadOnlyUri: boolean }}
 */
export function validatePreflightConfig(env = process.env) {
  const uri = (env.MONGODB_READONLY_URI || env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error(
      "Missing connection URI: MONGODB_READONLY_URI (preferred for preflight) or MONGODB_URI is strictly required."
    );
  }

  const rawDb = env.MONGODB_DB;
  if (!rawDb || typeof rawDb !== "string" || !rawDb.trim()) {
    throw new Error(
      "Missing database target: MONGODB_DB is strictly required. Fallbacks to default database or TEST_MONGODB_DB are prohibited."
    );
  }

  const dbName = rawDb.trim();
  const forbiddenDbs = new Set(["admin", "local", "config", "test"]);
  if (forbiddenDbs.has(dbName.toLowerCase())) {
    throw new Error(
      `Forbidden database name "${dbName}": System and test databases are strictly prohibited for production preflight.`
    );
  }

  // MongoDB database name restrictions: no whitespace, no /\. "$*<>:|?
  if (/[\/\\.\s"$*<>:|?]/.test(dbName)) {
    throw new Error(
      `Invalid database name "${dbName}": Database names cannot contain whitespace, slashes, or special characters.`
    );
  }

  return {
    uri,
    dbName,
    isExplicitReadOnlyUri: Boolean(env.MONGODB_READONLY_URI && env.MONGODB_READONLY_URI.trim()),
  };
}

/* ----------------------------- CLI Runner --------------------------------- */

async function runCli() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Birhane Hiwot Sunday School — Legacy Enrollment Reconciliation Utility (Phase 5)

Usage:
  node scripts/reconcile-legacy-enrollments.mjs [options]

Options:
  --output <path>        Path to write report (JSON or CSV). If omitted, prints to stdout.
  --format <json|csv>    Report file format (default: inferred from output extension or "json").
  --year <academicYear>  Filter students by academic year (e.g., --year 2018).
  --limit <number>       Limit the number of student documents examined.
  --batch-size <number>  Cursor batch size (default: 200).
  --no-orphans           Skip scanning for orphaned enrollment documents.
  --overwrite            Allow overwriting output file if it already exists.
  --help                 Display this help message.
`);
    process.exit(0);
  }

  function getArg(name, fallback = null) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  }

  const outputPath = getArg("output");
  const requestedFormat = (getArg("format") || "").toLowerCase();
  const yearFilter = getArg("year");
  const limit = getArg("limit") ? parseInt(getArg("limit"), 10) : undefined;
  const batchSize = getArg("batch-size") ? parseInt(getArg("batch-size"), 10) : 200;
  const skipOrphans = args.includes("--no-orphans");
  const allowOverwrite = args.includes("--overwrite");

  // Pre-connection validation: fail closed before creating any client
  let config;
  try {
    config = validatePreflightConfig(process.env);
  } catch (configErr) {
    console.error(`\n[PREFLIGHT CONFIGURATION ERROR] ${configErr.message}`);
    console.error("Please configure MONGODB_DB and MONGODB_READONLY_URI (or MONGODB_URI) before running.");
    process.exit(1);
  }

  const { uri, dbName, isExplicitReadOnlyUri } = config;

  if (!isExplicitReadOnlyUri) {
    console.warn(
      `\n[SECURITY NOTICE] Running with MONGODB_URI. For production preflight, ` +
        `a dedicated MONGODB_READONLY_URI is strongly recommended.`
    );
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);

    // Verify database-level read-only permissions before collection scans
    const permResult = await verifyReadOnlyPermissions(db);
    console.log(
      `\n[SECURITY VERIFIED] Authenticated user confirmed with read-only role(s): ${permResult.roles.map((r) => `${r.role}@${r.db}`).join(", ")}`
    );

    console.log(`\nConnected to database: ${dbName} (read-only preflight mode)...`);

    const report = await reconcileLegacyEnrollments(db, {
      academicYear: yearFilter,
      batchSize,
      limit,
      orphanedCheck: !skipOrphans,
    });

    // Console output summary
    console.log(formatAsConsole(report));

    // File export if requested
    if (outputPath) {
      let format = requestedFormat;
      if (!format) {
        format = outputPath.endsWith(".csv") ? "csv" : "json";
      }

      let fileContent = "";
      if (format === "csv") {
        fileContent = formatAsCsv(report);
      } else {
        fileContent = formatAsJson(report);
      }

      const writtenPath = safelyWriteReportFile(outputPath, fileContent, allowOverwrite);
      console.log(`Report successfully exported to: ${writtenPath}`);
    }
  } catch (err) {
    console.error("\nReconciliation audit failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Check if executed directly as a script
const isDirectCli =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("reconcile-legacy-enrollments.mjs") ||
    process.argv[1].endsWith("reconcile-legacy-enrollments"));

if (isDirectCli) {
  runCli();
}
