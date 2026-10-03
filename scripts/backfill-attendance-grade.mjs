// scripts/backfill-attendance-grade.mjs
// One-time backfill: stamps each attendance row with the student's Grade so
// grade-scoped queries don't need a giant $in on student IDs.
// Run: node scripts/backfill-attendance-grade.mjs
// Idempotent — re-running only touches rows still missing Grade.

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  console.error("Make sure .env.local exists with: MONGODB_URI=your_connection_string");
  process.exit(1);
}

const BATCH = 2000;

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "sunday_school");
  const attendance = db.collection("attendance");
  const students = db.collection("students");

  const missing = await attendance.countDocuments({ Grade: { $exists: false } });
  console.log(`Attendance rows missing Grade: ${missing}`);
  if (missing === 0) {
    console.log("Nothing to backfill ✅");
    await client.close();
    return;
  }

  // studentId -> Grade lookup table
  const gradeById = new Map();
  const cursor = students.find({}, { projection: { _id: 1, Grade: 1 } });
  for await (const s of cursor) {
    gradeById.set(s._id.toString(), s.Grade);
  }
  console.log(`Loaded ${gradeById.size} student grades`);

  let matched = 0;
  let unmatched = 0;
  let cursor_ = null;

  while (true) {
    const query = { Grade: { $exists: false } };
    if (cursor_) query._id = { $gt: cursor_ };

    const batch = await attendance
      .find(query, { projection: { _id: 1, studentId: 1 } })
      .sort({ _id: 1 })
      .limit(BATCH)
      .toArray();
    if (batch.length === 0) break;

    const operations = [];
    for (const row of batch) {
      const grade = gradeById.get(String(row.studentId));
      if (grade) {
        operations.push({
          updateOne: {
            filter: { _id: row._id },
            update: { $set: { Grade: grade } },
          },
        });
        matched++;
      } else {
        unmatched++;
      }
    }
    if (operations.length > 0) {
      await attendance.bulkWrite(operations, { ordered: false });
    }

    cursor_ = batch[batch.length - 1]._id;
    console.log(`  processed ${matched + unmatched}/${missing} (matched: ${matched}, no student: ${unmatched})`);
  }

  console.log(`\nDone ✅  matched: ${matched}, no matching student: ${unmatched}`);
  await client.close();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
