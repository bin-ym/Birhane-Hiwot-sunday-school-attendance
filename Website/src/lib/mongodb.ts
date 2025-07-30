// src/lib/mongodb.ts
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function getDb() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('sunday_school');
}