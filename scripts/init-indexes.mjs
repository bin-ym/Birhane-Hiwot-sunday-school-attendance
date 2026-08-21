// scripts/init-indexes.mjs
// Run once: node scripts/init-indexes.mjs
// Creates indexes on common query fields to speed up student record loading.

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env.local (Next.js convention)
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

async function main() {
  try {
    await client.connect();
    const db = client.db("sunday_school");
    const students = db.collection("students");

    console.log("Connected. Creating indexes on 'students' collection...\n");

    // 1. Index on Unique_ID — used for individual lookups and duplication checks
    await students.createIndex({ Unique_ID: 1 }, { unique: true });
    console.log("  ✅ Created unique index on 'Unique_ID'");

    // 2. Index on Academic_Year — used for filtering by academic year
    await students.createIndex({ Academic_Year: 1 });
    console.log("  ✅ Created index on 'Academic_Year'");

    // 3. Compound index on Grade + Academic_Year — covers both grade and combined filters
    await students.createIndex({ Grade: 1, Academic_Year: 1 });
    console.log("  ✅ Created compound index on 'Grade + Academic_Year'");

    console.log("\nAll indexes created successfully!");
    console.log("Indexes on 'students' collection:");
    const indexes = await students.indexes();
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    await client.close();
  } catch (err) {
    console.error("Failed to create indexes:", err);
    process.exit(1);
  }
}

main();
