// scripts/migrate-subjects-to-string-array.mjs
// Convert grouped subject documents from:
//   { academicYear, grade, gradeNumber, subjects: [{ name: "X" }, { name: "Y" }] }
// to:
//   { academicYear, grade, gradeNumber, subjects: ["X", "Y"] }
//
// Also normalizes field order to: academicYear, grade, gradeNumber, subjects.
//
// Usage:
//   node scripts/migrate-subjects-to-string-array.mjs          # DRY RUN
//   node scripts/migrate-subjects-to-string-array.mjs --apply   # write changes

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");
    const subjects = db.collection("subjects");

    console.log(`Connected. ${APPLY ? "APPLY MODE" : "DRY RUN"}\n`);

    const all = await subjects.find({}).toArray();
    console.log(`Total documents: ${all.length}`);

    // Find docs that need conversion (subjects is array of objects)
    const needConvert = all.filter((doc) => {
      const s = doc.subjects;
      if (!Array.isArray(s) || s.length === 0) return false;
      // If first element is an object with a 'name' property, it's old format
      return typeof s[0] === "object" && s[0] !== null && "name" in s[0];
    });

    console.log(`Documents needing conversion: ${needConvert.length}`);

    if (needConvert.length === 0) {
      console.log("Nothing to migrate.");
      await client.close();
      return;
    }

    for (const doc of needConvert) {
      const newSubjects = doc.subjects.map((s) => s.name || s);
      console.log(`\n  ${doc.academicYear} / ${doc.grade}`);
      console.log(`    before: ${JSON.stringify(doc.subjects)}`);
      console.log(`    after:  ${JSON.stringify(newSubjects)}`);
    }

    if (APPLY) {
      const ops = needConvert.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              academicYear: doc.academicYear,
              grade: doc.grade,
              gradeNumber: doc.gradeNumber ?? null,
              subjects: doc.subjects.map((s) => s.name || s),
            },
          },
        },
      }));

      const result = await subjects.bulkWrite(ops, { ordered: false });
      console.log(`\n✅ Updated ${result.modifiedCount} documents.`);
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
