// scripts/test.mjs
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(`Error: .env.local file not found at ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });
console.log("Loaded .env.local from:", envPath);

async function insertOrUpdateUser() {
  const uri = process.env.MONGODB_URI;
  const dbName = "sunday_school";

  if (!uri) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error(
      'Error: MONGODB_URI must start with "mongodb://" or "mongodb+srv://"'
    );
    process.exit(1);
  }

  console.log(
    "Connecting to MongoDB with URI:",
    uri.replace(/:([^@]+)@/, ":****@")
  ); // Hide password

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);
    const usersCollection = db.collection("users");

    const email = "bingut@gmail.com";
    const plainPassword = "binym12";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      const result = await usersCollection.updateOne(
        { email },
        { $set: { password: hashedPassword } }
      );
      console.log(`Updated user ${email}. Modified: ${result.modifiedCount}`);
    } else {
      const user = { email, password: hashedPassword };
      const result = await usersCollection.insertOne(user);
      console.log(`Inserted user ${email} with ID: ${result.insertedId}`);
    }
  } catch (error) {
    console.error("Error inserting/updating user:", error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

insertOrUpdateUser();