// scripts/inspect-grades.mjs
// READ-ONLY. Run once: node scripts/inspect-grades.mjs
// Prints every distinct grade value and its count from the collections that store grades,
// so you can decide what a grade migration should map from -> to.

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  console.error("Make sure .env.local exists with: MONGODB_URI=your_connection_string");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
});

async function distinctGrades(collection, field) {
  const values = await collection.aggregate([
    { $match: { [field]: { $ne: null } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  return values;
}

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");

    const targets = [
      { name: "students", field: "Grade" },
      { name: "users", field: "grade" },
      { name: "subjects", field: "grade" },
    ];

    for (const t of targets) {
      const coll = db.collection(t.name);
      const total = await coll.countDocuments();
      console.log(`\n=== ${t.name} (${t.field}) — total docs: ${total} ===`);
      const values = await distinctGrades(coll, t.field);
      if (values.length === 0) {
        console.log("  (no values)");
      }
      for (const v of values) {
        const shown = JSON.stringify(v._id);
        console.log(`  ${v.count.toString().padStart(5)} × ${shown}`);
      }
    }

    await client.close();
    console.log("\nDone. This script made NO changes to the database.");
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

main();
