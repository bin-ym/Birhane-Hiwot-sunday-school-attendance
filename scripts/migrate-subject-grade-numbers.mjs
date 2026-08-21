// scripts/migrate-subject-grade-numbers.mjs
// Backfill `gradeNumber` on all existing subject documents.
//
// Derives the numeric grade (0–12) from the `grade` field using the canonical
// mapping, then updates documents that are missing the field.
//
// Usage:
//   node scripts/migrate-subject-grade-numbers.mjs          # DRY RUN
//   node scripts/migrate-subject-grade-numbers.mjs --apply   # write changes

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Canonical Amharic grade name → grade number
const GRADE_NUMBER_MAP = {
  "ቅድመ መደበኛ": 0,
  "አንደኛ ክፍል": 1,
  "ሁለተኛ ክፍል": 2,
  "ሦስተኛ ክፍል": 3,
  "አራተኛ ክፍል": 4,
  "አምስተኛ ክፍል": 5,
  "ስድስተኛ ክፍል": 6,
  "ሰባተኛ ክፍል ጥዋት": 7,
  "ሰባተኛ ክፍል ከሰዓት": 7,
  "ስምንተኛ ክፍል": 8,
  "ዘጠነኛ ክፍል": 9,
  "አስረኛ ክፍል": 10,
  "አስራ አንደኛ ክፍል": 11,
  "አስራ ሁለተኛ ክፍል": 12,
};

// English fallbacks (in case some documents stored "Grade N")
const ENGLISH_MAP = {
  "Grade 0": 0,
  "Grade 1": 1,
  "Grade 2": 2,
  "Grade 3": 3,
  "Grade 4": 4,
  "Grade 5": 5,
  "Grade 6": 6,
  "Grade 7": 7,
  "Grade 8": 8,
  "Grade 9": 9,
  "Grade 10": 10,
  "Grade 11": 11,
  "Grade 12": 12,
};

function deriveGradeNumber(gradeName) {
  if (typeof gradeName !== "string") return null;
  if (gradeName in GRADE_NUMBER_MAP) return GRADE_NUMBER_MAP[gradeName];
  if (gradeName in ENGLISH_MAP) return ENGLISH_MAP[gradeName];
  // Try to extract a number from the string
  const match = gradeName.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");
    const subjects = db.collection("subjects");

    console.log(
      `Connected. ${APPLY ? "APPLY MODE — will write changes" : "DRY RUN — no changes will be written"}\n`,
    );

    // Find subjects that are missing gradeNumber or have gradeNumber: null
    const all = await subjects
      .find(
        {
          $or: [
            { gradeNumber: { $exists: false } },
            { gradeNumber: null },
            { gradeNumber: { $type: "string" } },
          ],
        },
        { projection: { name: 1, grade: 1, gradeNumber: 1, academicYear: 1 } },
      )
      .toArray();

    console.log(`Subjects missing gradeNumber: ${all.length}`);

    const updates = [];
    const skipped = [];

    for (const doc of all) {
      const num = deriveGradeNumber(doc.grade);
      if (num === null) {
        skipped.push(doc);
        continue;
      }
      updates.push({
        filter: { _id: doc._id },
        update: { $set: { gradeNumber: num } },
        _debug: { name: doc.name, grade: doc.grade, gradeNumber: num },
      });
    }

    console.log(`  → Will update: ${updates.length}`);
    console.log(`  → Skipped (unrecognized grade): ${skipped.length}`);

    if (updates.length > 0) {
      console.log("\nSample updates:");
      updates.slice(0, 15).forEach((u) => {
        console.log(
          `  "${u._debug.name}"  grade="${u._debug.grade}"  → gradeNumber=${u._debug.gradeNumber}`,
        );
      });
      if (updates.length > 15) console.log(`  … and ${updates.length - 15} more`);
    }

    if (skipped.length > 0) {
      console.log("\nSkipped subjects:");
      skipped.slice(0, 10).forEach((s) => {
        console.log(`  "${s.name}"  grade="${s.grade}"`);
      });
      if (skipped.length > 10) console.log(`  … and ${skipped.length - 10} more`);
    }

    if (APPLY && updates.length > 0) {
      const result = await subjects.bulkWrite(
        updates.map(({ filter, update }) => ({ updateOne: { filter, update } })),
        { ordered: false },
      );
      console.log(`\n✅ Updated ${result.modifiedCount} subjects with gradeNumber.`);
    } else if (!APPLY) {
      console.log(
        "\nDry run complete. Re-run with --apply to write changes.",
      );
    }

    await client.close();
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

main();
