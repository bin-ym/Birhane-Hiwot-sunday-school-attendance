// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

// Use a global variable to cache the client promise in development
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    console.log('Returning cached MongoDB database instance');
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env.local');
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  try {
    // In development, use global caching to prevent multiple connections
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        console.log('Creating new MongoDB client for development');
        client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 5000,
        });
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      // In production (Vercel), create a new client for each request
      console.log('Creating new MongoDB client for production');
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      clientPromise = client.connect();
    }

    const connectedClient = await clientPromise;
    const db = connectedClient.db('sunday_school');
    cachedDb = db;
    console.log('MongoDB connected successfully to sunday_school database');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Reset client and promise on failure to allow retry
    client = null;
    clientPromise = null;
    cachedDb = null;
    throw new Error('Failed to connect to MongoDB');
  }
}

export async function closeDb(): Promise<void> {
  if (client && process.env.NODE_ENV !== 'development') {
    console.log('Closing MongoDB client');
    await client.close();
    client = null;
    clientPromise = null;
    cachedDb = null;
  }
}