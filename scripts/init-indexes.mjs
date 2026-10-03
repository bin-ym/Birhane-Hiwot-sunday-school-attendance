// scripts/init-indexes.mjs
// Run once: node scripts/init-indexes.mjs
// Creates indexes on common query fields to speed up student record loading.
// Idempotent — safe to re-run.

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
    const db = client.db(process.env.MONGODB_DB || "sunday_school");

    console.log("Connected. Creating indexes...\n");

    // --- students ---
    const students = db.collection("students");

    // 1. Index on Unique_ID — used for individual lookups and duplication checks
    await students.createIndex({ Unique_ID: 1 }, { unique: true });
    console.log("  ✅ students: unique index on 'Unique_ID'");

    // 2. Index on Academic_Year — used for filtering by academic year
    await students.createIndex({ Academic_Year: 1 });
    console.log("  ✅ students: index on 'Academic_Year'");

    // 3. Compound index on Grade + Academic_Year — covers both grade and combined filters
    await students.createIndex({ Grade: 1, Academic_Year: 1 });
    console.log("  ✅ students: compound index on 'Grade + Academic_Year'");

    // --- attendance (critical at scale: every read/write hits this) ---
    const attendance = db.collection("attendance");

    // 4. Unique compound index matching the upsert filter in POST /api/attendance.
    //    Guarantees no duplicate (studentId, date) rows and makes the bulk
    //    upsert O(log n) instead of a collection scan per record.
    await attendance.createIndex({ studentId: 1, date: 1 }, { unique: true });
    console.log("  ✅ attendance: unique compound index on 'studentId + date'");

    // 5. Date index — dashboards/reports query by date first
    await attendance.createIndex({ date: 1 });
    console.log("  ✅ attendance: index on 'date'");

    // 6. Grade index — grade-scoped summary queries (see denormalized Grade field)
    await attendance.createIndex({ Grade: 1, date: 1 });
    console.log("  ✅ attendance: compound index on 'Grade + date'");

    // --- users (login path: queried on EVERY sign-in) ---
    const users = db.collection("users");

    // 7. Unique index on email — login lookups + duplicate-email prevention
    await users.createIndex({ email: 1 }, { unique: true });
    console.log("  ✅ users: unique index on 'email'");

    // 8. Role index — role-filtered user listings
    await users.createIndex({ role: 1 });
    console.log("  ✅ users: index on 'role'");

    // --- temp_attendance (QR/queue ingestion; aggregated by date) ---
    const tempAttendance = db.collection("temp_attendance");

    await tempAttendance.createIndex({ date: 1 });
    await tempAttendance.createIndex({ studentId: 1, date: 1 });
    console.log("  ✅ temp_attendance: indexes on 'date' and 'studentId + date'");

    // --- notifications ---
    const notifications = db.collection("notifications");
    await notifications.createIndex({ createdAt: -1 });
    await notifications.createIndex({ targetRoles: 1, createdAt: -1 });
    console.log("  ✅ notifications: indexes on 'createdAt' and 'targetRoles + createdAt'");

    console.log("\nAll indexes created successfully!");
    for (const name of ["students", "attendance", "users", "temp_attendance", "notifications"]) {
      const indexes = await db.collection(name).indexes();
      console.log(`\nIndexes on '${name}':`);
      indexes.forEach((idx) => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    }

    await client.close();
  } catch (err) {
    console.error("Failed to create indexes:", err);
    process.exit(1);
  }
}

main();
