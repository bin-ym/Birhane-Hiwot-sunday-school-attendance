// scripts/migrate-subjects-to-grouped.mjs
// Convert flat subject documents to grouped format.
//
// Before (flat):
//   { _id, name: "መሠረተ ሃይማኖት", grade: "አንደኛ ክፍል", gradeNumber: 1, academicYear: "2016" }
//   { _id, name: "ክርስቲያናዊ ሥነ ምግባር", grade: "አንደኛ ክፍል", gradeNumber: 1, academicYear: "2016" }
//
// After (grouped):
//   { _id, grade: "አንደኛ ክፍል", gradeNumber: 1, academicYear: "2016",
//     subjects: [{ name: "መሠረተ ሃይማኖት" }, { name: "ክርስቲያናዊ ሥነ ምግባር" }] }
//
// Usage:
//   node scripts/migrate-subjects-to-grouped.mjs          # DRY RUN
//   node scripts/migrate-subjects-to-grouped.mjs --apply   # write changes

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Grade name → grade number
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

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");
    const subjects = db.collection("subjects");

    console.log(`Connected. ${APPLY ? "APPLY MODE — will write changes" : "DRY RUN — no changes will be written"}\n`);

    // Check if already grouped (any doc with a subjects array = already grouped)
    const anyGrouped = await subjects.findOne({ subjects: { $exists: true, $type: "array" } });
    if (anyGrouped) {
      console.log("⚠️  Collection already has grouped documents.");
      console.log("   This migration expects flat documents. If you have a mix,");
      console.log("   clean up manually before running.\n");
    }

    // Read all flat documents
    const all = await subjects.find({}).toArray();
    console.log(`Total documents in subjects collection: ${all.length}`);

    // Separate flat from grouped
    const flat = all.filter((doc) => !Array.isArray(doc.subjects));
    const grouped = all.filter((doc) => Array.isArray(doc.subjects));

    console.log(`  Flat documents: ${flat.length}`);
    console.log(`  Already grouped: ${grouped.length}`);

    if (flat.length === 0) {
      console.log("\nNothing to migrate — all documents are already grouped.");
      await client.close();
      return;
    }

    // Group flat docs by grade + academicYear
    const groups = new Map();
    for (const doc of flat) {
      const key = `${doc.grade}|||${doc.academicYear}`;
      if (!groups.has(key)) {
        groups.set(key, {
          grade: doc.grade,
          gradeNumber: doc.gradeNumber ?? GRADE_NUMBER_MAP[doc.grade] ?? null,
          academicYear: doc.academicYear,
          entries: [],
          ids: [],
        });
      }
      const g = groups.get(key);
      g.entries.push({ name: doc.name });
      g.ids.push(doc._id);
    }

    console.log(`\nUnique grade+year groups to create: ${groups.size}`);

    // Print preview
    for (const [, g] of groups) {
      console.log(`\n  ${g.grade} / ${g.academicYear} EC  (gradeNumber: ${g.gradeNumber})`);
      g.entries.forEach((e) => console.log(`    + ${e.name}`));
    }

    if (APPLY) {
      console.log("\nApplying migration...");

      let created = 0;
      let merged = 0;
      let errors = 0;

      for (const [, g] of groups) {
        try {
          // Check if a group doc already exists for this grade+year
          const existing = await subjects.findOne({
            grade: g.grade,
            academicYear: g.academicYear,
            subjects: { $exists: true, $type: "array" },
          });

          if (existing) {
            // Merge into existing group
            const existingNames = new Set(
              (existing.subjects || []).map((s) => s.name),
            );
            const newEntries = g.entries.filter((e) => !existingNames.has(e.name));

            if (newEntries.length > 0) {
              await subjects.updateOne(
                { _id: existing._id },
                { $push: { subjects: { $each: newEntries } } },
              );
            }
            merged++;
          } else {
            // Create new grouped document
            await subjects.insertOne({
              grade: g.grade,
              gradeNumber: g.gradeNumber,
              academicYear: g.academicYear,
              subjects: g.entries,
            });
            created++;
          }

          // Delete old flat documents
          await subjects.deleteMany({ _id: { $in: g.ids } });
        } catch (err) {
          console.error(`  ❌ Error processing ${g.grade}/${g.academicYear}:`, err.message);
          errors++;
        }
      }

      console.log(`\n✅ Migration complete:`);
      console.log(`   Created: ${created} groups`);
      console.log(`   Merged into existing: ${merged} groups`);
      console.log(`   Errors: ${errors}`);
      console.log(`   Old flat documents deleted: ${flat.length}`);
    } else {
      console.log("\nDry run complete. Re-run with --apply to write changes.");
    }

    await client.close();
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

main();
