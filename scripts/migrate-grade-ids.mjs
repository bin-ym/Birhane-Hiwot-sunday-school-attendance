// scripts/migrate-grade-ids.mjs
// Grade-data cleanup migration.
//
// 1. DELETE students that have no Unique_ID (legacy import junk), plus their
//    orphaned attendance / payments / payment_status / student_results rows.
// 2. NORMALIZE grade values to canonical Amharic names across students,
//    subjects, and users (English "Grade N", typos, legacy formats).
// 3. FIX Unique_ID grade segments (ብሕ/{YY}/{GG}/{NNN}) to the correct number.
//    ሰባተኛ ክፍል ጥዋት = 07, ሰባተኛ ክፍል ከሰዓት = 08.
//
// Usage:
//   node scripts/migrate-grade-ids.mjs          # DRY RUN: report only, write nothing
//   node scripts/migrate-grade-ids.mjs --apply  # actually update the database

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  console.error("Make sure .env.local exists with: MONGODB_URI=your_connection_string");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// --- Canonical grade names ------------------------------------------------

const CANONICAL = [
  "ቅድመ መደበኛ",
  "አንደኛ ክፍል",
  "ሁለተኛ ክፍል",
  "ሦስተኛ ክፍል",
  "አራተኛ ክፍል",
  "አምስተኛ ክፍል",
  "ስድስተኛ ክፍል",
  "ሰባተኛ ክፍል ጥዋት",
  "ሰባተኛ ክፍል ከሰዓት",
  "ስምንተኛ ክፍል",
  "ዘጠነኛ ክፍል",
  "አስረኛ ክፍል",
  "አስራ አንደኛ ክፍል",
  "አስራ ሁለተኛ ክፍል",
];

// Non-canonical stored value -> canonical Amharic
const NORMALIZE = {
  "Grade 0": "ቅድመ መደበኛ",
  "Grade 1": "አንደኛ ክፍል",
  "Grade 2": "ሁለተኛ ክፍል",
  "Grade 3": "ሦስተኛ ክፍል",
  "Grade 4": "አራተኛ ክፍል",
  "Grade 5": "አምስተኛ ክፍል",
  "Grade 6": "ስድስተኛ ክፍል",
  "Grade 7": "ሰባተኛ ክፍል ጥዋት",
  "Grade 8": "ስምንተኛ ክፍል",
  "Grade 9": "ዘጠነኛ ክፍል",
  "Grade 10": "አስረኛ ክፍል",
  "Grade 11": "አስራ አንደኛ ክፍል",
  "Grade 12": "አስራ ሁለተኛ ክፍል",
  "አስራኛ ክፍል": "አስረኛ ክፍል", // typo for Grade 10
  "ዘጠኝ ክፍል": "ዘጠነኛ ክፍል",       // typo for Grade 9
};

function normalize(value) {
  if (typeof value !== "string") return value;
  return NORMALIZE[value] ?? value;
}

// Manual per-student grade corrections decided with the user.
// Yoas Tagel (ብሕ/18/01/01): stored ሰባተኛ ክፍል ጥዋት was wrong — his ID says Grade 1.
const GRADE_OVERRIDES = {
  "68cc5753933b8f6be3aa68ce": "አንደኛ ክፍል",
};

// Canonical grade -> correct 2-digit ID segment (ጥዋት=07, ከሰዓት=08)
const SEGMENT = {
  "ቅድመ መደበኛ": "00",
  "አንደኛ ክፍል": "01",
  "ሁለተኛ ክፍል": "02",
  "ሦስተኛ ክፍል": "03",
  "አራተኛ ክፍል": "04",
  "አምስተኛ ክፍል": "05",
  "ስድስተኛ ክፍል": "06",
  "ሰባተኛ ክፍል ጥዋት": "07",
  "ሰባተኛ ክፍል ከሰዓት": "08",
  "ስምንተኛ ክፍል": "08",
  "ዘጠነኛ ክፍል": "09",
  "አስረኛ ክፍል": "10",
  "አስራ አንደኛ ክፍል": "11",
  "አስራ ሁለተኛ ክፍል": "12",
};

function rebuildId(uniqueId, segment) {
  const parts = String(uniqueId || "").split("/");
  if (parts.length !== 4) return null;
  parts[2] = segment;
  return parts.join("/");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");
    const students = db.collection("students");
    const subjects = db.collection("subjects");
    const users = db.collection("users");

    console.log(`Connected. ${APPLY ? "APPLY MODE — will write changes" : "DRY RUN — no changes will be written"}\n`);

    // ===== STEP 1: delete students without Unique_ID =====
    console.log("=== STEP 1: Remove students with no Unique_ID ===");
    const noId = await students
      .find(
        { $or: [{ Unique_ID: { $in: [null, "", undefined] } }, { Unique_ID: { $exists: false } }] },
        { projection: { Unique_ID: 1 } },
      )
      .toArray();
    console.log(`  Students without Unique_ID: ${noId.length}`);
    const deletedIds = noId.map((s) => s._id.toString());

    // Count orphaned rows referencing those students
    const orphanTargets = [
      { name: "attendance", field: "studentId" },
      { name: "payments", field: "studentId" },
      { name: "payment_status", field: "studentId" },
      { name: "student_results", field: "studentId" },
    ];
    const orphanCounts = {};
    for (const t of orphanTargets) {
      const count = await db.collection(t.name).countDocuments({ [t.field]: { $in: deletedIds } });
      orphanCounts[t.name] = count;
      if (count > 0) console.log(`  ⚠ Orphaned rows in "${t.name}": ${count} (will be deleted with their students)`);
    }
    if (APPLY && noId.length > 0) {
      await students.deleteMany({ _id: { $in: noId.map((s) => s._id) } });
      for (const t of orphanTargets) {
        if (orphanCounts[t.name] > 0) {
          await db.collection(t.name).deleteMany({ [t.field]: { $in: deletedIds } });
        }
      }
      console.log(`  ✅ Deleted ${noId.length} students + ${Object.values(orphanCounts).reduce((a, b) => a + b, 0)} orphaned rows`);
    }

    // ===== STEP 2: normalize grade values =====
    console.log("\n=== STEP 2: Normalize grade values to canonical Amharic ===");

    // students.Grade (with manual overrides applied)
    const studAll = await students.find({}, { projection: { Unique_ID: 1, Grade: 1 } }).toArray();
    const studChanges = studAll
      .filter((s) => {
        const effective = GRADE_OVERRIDES[s._id.toString()] ?? normalize(s.Grade);
        return typeof s.Grade === "string" && effective !== s.Grade;
      })
      .map((s) => ({
        id: s._id,
        old: s.Grade,
        next: GRADE_OVERRIDES[s._id.toString()] ?? normalize(s.Grade),
        Unique_ID: s.Unique_ID,
      }));
    console.log(`  students.Grade: ${studChanges.length} to change`);
    studChanges.slice(0, 10).forEach((c) => console.log(`    ${JSON.stringify(c.old)}  →  ${JSON.stringify(c.next)}`));
    if (studChanges.length > 10) console.log(`    … and ${studChanges.length - 10} more`);

    // subjects.grade
    const subAll = await subjects.find({}, { projection: { name: 1, grade: 1 } }).toArray();
    const subChanges = subAll
      .filter((s) => typeof s.grade === "string" && normalize(s.grade) !== s.grade)
      .map((s) => ({ id: s._id, old: s.grade, next: normalize(s.grade), name: s.name }));
    console.log(`  subjects.grade: ${subChanges.length} to change`);
    subChanges.slice(0, 10).forEach((c) => console.log(`    ${JSON.stringify(c.old)}  →  ${JSON.stringify(c.next)}`));
    if (subChanges.length > 10) console.log(`    … and ${subChanges.length - 10} more`);

    // users.grade (string or array)
    const userAll = await users.find({}, { projection: { email: 1, grade: 1 } }).toArray();
    const userChanges = userAll
      .filter((u) => {
        if (typeof u.grade === "string") return normalize(u.grade) !== u.grade;
        if (Array.isArray(u.grade)) return u.grade.some((g) => normalize(g) !== g);
        return false;
      })
      .map((u) => ({
        id: u._id,
        email: u.email,
        old: u.grade,
        next: Array.isArray(u.grade)
          ? [...new Set(u.grade.map((g) => normalize(g)))]
          : normalize(u.grade),
      }));
    console.log(`  users.grade: ${userChanges.length} to change`);
    userChanges.slice(0, 6).forEach((c) => console.log(`    ${JSON.stringify(c.old)}  →  ${JSON.stringify(c.next)}`));
    if (userChanges.length > 6) console.log(`    … and ${userChanges.length - 6} more`);

    if (APPLY) {
      if (studChanges.length > 0) {
        await students.bulkWrite(
          studChanges.map((c) => ({ updateOne: { filter: { _id: c.id }, update: { $set: { Grade: c.next } } } })),
          { ordered: false },
        );
      }
      if (subChanges.length > 0) {
        await subjects.bulkWrite(
          subChanges.map((c) => ({ updateOne: { filter: { _id: c.id }, update: { $set: { grade: c.next } } } })),
          { ordered: false },
        );
      }
      if (userChanges.length > 0) {
        await users.bulkWrite(
          userChanges.map((c) => ({ updateOne: { filter: { _id: c.id }, update: { $set: { grade: c.next } } } })),
          { ordered: false },
        );
      }
      console.log(`  ✅ Updated ${studChanges.length} students, ${subChanges.length} subjects, ${userChanges.length} users`);
    }

    // ===== STEP 3: fix Unique_ID segments =====
    console.log("\n=== STEP 3: Fix Unique_ID grade segments ===");
    // Re-read students after possible normalization + deletion
    const after = await students.find({}, { projection: { Unique_ID: 1, Grade: 1 } }).toArray();
    const existingIds = new Set(after.map((s) => s.Unique_ID).filter(Boolean));
    const changes = [];
    const skipped = [];

    for (const s of after) {
      const effective = GRADE_OVERRIDES[s._id.toString()] ?? normalize(s.Grade);
      const seg = SEGMENT[effective];
      if (!seg) {
        skipped.push({ id: s.Unique_ID || "(none)", reason: `grade not in canonical list: ${JSON.stringify(s.Grade)}` });
        continue;
      }
      const newId = rebuildId(s.Unique_ID, seg);
      if (!newId) {
        skipped.push({ id: s.Unique_ID || "(none)", reason: `unrecognized Unique_ID format: ${JSON.stringify(s.Unique_ID)}` });
        continue;
      }
      if (newId === s.Unique_ID) continue;
      changes.push({ old: s.Unique_ID, new: newId, grade: effective });
    }

    // True collision = a target that is (a) targeted by 2+ changed students, or
    // (b) currently held by a student who is NOT moving away.
    const movingOld = new Set(changes.map((c) => c.old));
    const seen = new Map();
    for (const c of changes) seen.set(c.new, (seen.get(c.new) || 0) + 1);

    const collisionSet = new Set();
    for (const c of changes) {
      if (seen.get(c.new) > 1 || (existingIds.has(c.new) && !movingOld.has(c.new))) {
        collisionSet.add(c.new);
      }
    }
    const safe = changes.filter((c) => !collisionSet.has(c.new));

    console.log(`  Students with IDs to fix: ${changes.length}`);
    console.log(`    ✓ will be fixed (two-phase update): ${safe.length}`);
    console.log(`    ✗ true collisions (need manual decision): ${collisionSet.size}`);
    const byGrade = new Map();
    for (const c of safe) {
      if (!byGrade.has(c.grade)) byGrade.set(c.grade, []);
      byGrade.get(c.grade).push(`${c.old}  →  ${c.new}`);
    }
    for (const [grade, list] of byGrade) {
      console.log(`  ${grade} (${list.length}):`);
      list.slice(0, 6).forEach((l) => console.log(`      ${l}`));
      if (list.length > 6) console.log(`      … and ${list.length - 6} more`);
    }
    if (collisionSet.size > 0) {
      console.log("  True collision details:");
      for (const id of collisionSet) {
        const involved = changes.filter((c) => c.new === id).map((c) => c.old);
        console.log(`      ${id}  ←  ${involved.join(", ")}`);
      }
    }
    if (skipped.length > 0) {
      console.log(`  Skipped (${skipped.length}):`);
      skipped.slice(0, 10).forEach((s) => console.log(`      ${s.reason}  (${s.id})`));
    }

    if (APPLY && safe.length > 0) {
      // Two-phase update avoids the unique-index clash while IDs shift along
      // the grade ladder (07→06, 08→07, 09→08, ...).
      const temps = safe.map((c, i) => ({
        updateOne: { filter: { Unique_ID: c.old }, update: { $set: { Unique_ID: `ብሕ/TMP/${i}` } } },
      }));
      const finals = safe.map((c, i) => ({
        updateOne: { filter: { Unique_ID: `ብሕ/TMP/${i}` }, update: { $set: { Unique_ID: c.new } } },
      }));
      await students.bulkWrite(temps, { ordered: false });
      const result = await students.bulkWrite(finals, { ordered: false });
      console.log(`  ✅ Updated ${result.modifiedCount} Unique_IDs (true collisions left untouched)`);
    }

    await client.close();
    console.log(`\n${APPLY ? "Migration complete." : "Dry run complete. Re-run with --apply to write changes (collisions are still skipped)."}`);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

main();
