// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
    }

    const db = client.db('sunday_school');
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    cachedDb = null;
  }
}