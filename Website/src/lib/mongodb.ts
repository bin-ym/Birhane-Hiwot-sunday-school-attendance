// src/lib/mongodb.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb+srv://ym:sunday_school@cluster0.tchv8s6.mongodb.net/sunday_school?retryWrites=true&w=majority&appName=Cluster0";
let client: MongoClient | null = null;

export async function getDb() {
  if (!client) {
    console.log('Connecting to MongoDB...');
    try {
      client = new MongoClient(uri);
      await client.connect();
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw new Error('Failed to connect to MongoDB');
    }
  }
  return client.db('sunday_school');
}