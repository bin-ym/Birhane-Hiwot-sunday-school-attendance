#!/usr/bin/env node
/**
 * scripts/audit-student-unique-id.mjs
 *
 * Task 12 — Phase 4: Unique_ID Constraint Preflight Audit (Read-Only)
 * Birhane Hiwot Sunday School Attendance System
 *
 * Mode: Strictly READ-ONLY data-integrity preflight audit.
 *
 * Objectives:
 * 1. Read existing student records.
 * 2. Audit Unique_ID constraints for duplicate trimmed non-empty values.
 * 3. Audit for multiple null, empty string, or whitespace-only values.
 * 4. Return compatible: true/false with exact details.
 * 5. ZERO mutations: strictly read-only, never creates indexes or modifies documents.
 *
 * Usage:
 *   node scripts/audit-student-unique-id.mjs [options]
 *
 * Options:
 *   --output <path>        Path to write report (JSON format). If omitted, prints to stdout.
 *   --overwrite            Allow overwriting output file if it already exists.
 *   --help                 Display this help message.
 */

import path from "node:path";
import dns from "node:dns";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import {
  createReadOnlyDb,
  safelyWriteReportFile,
  validatePreflightConfig,
  verifyReadOnlyPermissions,
} from "./reconcile-legacy-enrollments.mjs";

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

/**
 * Preflight constraint audit function matching Phase 4 specifications.
 * Strictly read-only: uses aggregate and find queries only.
 *
 * @param {import("mongodb").Db} rawDb
 * @returns {Promise<{
 *   compatible: boolean;
 *   duplicateCount: number;
 *   duplicateValues: Array<{ uniqueId: string; count: number; studentIds: string[] }>;
 *   emptyOrNullCount: number;
 *   reason?: string;
 * }>}
 */
export async function auditStudentUniqueIdConstraintsCore(rawDb) {
  const db = createReadOnlyDb(rawDb);
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

  const duplicateValues = duplicateDocs.map((d) => ({
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

  // A sparse index indexes explicit null or empty string documents.
  // More than 1 document with null or empty string will collide on a unique sparse index.
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

/* ----------------------------- CLI Runner --------------------------------- */

async function runCli() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Birhane Hiwot Sunday School — Unique_ID Preflight Audit (Phase 4 Standalone)

Usage:
  node scripts/audit-student-unique-id.mjs [options]

Options:
  --output <path>        Path to write report (JSON format). If omitted, prints to stdout.
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
  const allowOverwrite = args.includes("--overwrite");

  // Pre-connection validation: fail closed before creating client
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
    console.log("Running Unique_ID constraint audit (strictly read-only)...");

    const result = await auditStudentUniqueIdConstraintsCore(db);

    const reportOutput = {
      timestamp: new Date().toISOString(),
      database: dbName,
      auditType: "Unique_ID_sparse_unique_preflight",
      result,
    };

    console.log("\n================================================================================");
    console.log("  PHASE 4: UNIQUE_ID PREFLIGHT AUDIT SUMMARY (READ-ONLY)");
    console.log("================================================================================");
    console.log(`Target Database       : ${dbName}`);
    console.log(`Compatibility Status  : ${result.compatible ? "COMPATIBLE (PASS)" : "INCOMPATIBLE (FAIL)"}`);
    console.log(`Duplicate Count       : ${result.duplicateCount}`);
    console.log(`Null/Empty Count      : ${result.emptyOrNullCount}`);
    if (result.reason) {
      console.log(`Failure Reason        : ${result.reason}`);
    }
    if (result.duplicateValues.length > 0) {
      console.log(`Duplicate Values      :`);
      for (const d of result.duplicateValues) {
        console.log(`  - Unique_ID: "${d.uniqueId}" | Count: ${d.count} | Document IDs: [${d.studentIds.join(", ")}]`);
      }
    }
    console.log("================================================================================");
    console.log("  NO DATABASE RECORDS OR INDEXES WERE CREATED OR MODIFIED");
    console.log("================================================================================\n");

    if (outputPath) {
      const fileContent = JSON.stringify(reportOutput, null, 2);
      const writtenPath = safelyWriteReportFile(outputPath, fileContent, allowOverwrite);
      console.log(`Report successfully exported to: ${writtenPath}`);
    }

    // Exit code 0 if compatible, 2 if incompatible (data conflicts)
    process.exit(result.compatible ? 0 : 2);
  } catch (err) {
    console.error("\nUnique_ID preflight audit failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Direct execution check
const isDirectCli =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("audit-student-unique-id.mjs") ||
    process.argv[1].endsWith("audit-student-unique-id"));

if (isDirectCli) {
  runCli();
}
