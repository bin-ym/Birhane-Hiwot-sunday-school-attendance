// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';
import { ensureCoreMongoIndexes } from './mongoIndexes';

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
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env.local');
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  try {
    // ALWAYS reuse one client per process. The previous behavior created a new
    // MongoClient (and its own connection pool) per request in production,
    // which exhausts MongoDB/Atlas connection limits under load.
    if (!clientPromise) {
      // dev: Next.js hot reload wipes module scope — restore the global client
      if (process.env.NODE_ENV === 'development' && global._mongoClientPromise) {
        clientPromise = global._mongoClientPromise;
      }
    }

    if (!clientPromise) {
      clientPromise = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10_000, // tolerate network latency spikes to Atlas
        maxPoolSize: 50, // concurrent operations per instance (M0 Atlas caps ~100 total connections; scale by adding instances, not pool size)
        minPoolSize: 2, // keep warm connections ready for bursts
        maxIdleTimeMS: 30_000,
        // Keep the driver's conservative default (2): aggressive values storm
        // Atlas with parallel handshakes and can trip wait-queue timeouts.
        maxConnecting: 2,
        waitQueueTimeoutMS: 10_000,
      }).connect();

      if (process.env.NODE_ENV === 'development') {
        // dev: Next.js hot reload wipes module scope — also cache on globalThis
        global._mongoClientPromise = clientPromise;
      }
    }

    const connectedClient = await clientPromise;
    const dbName = process.env.MONGODB_DB || 'sunday_school';
    const db = connectedClient.db(dbName);
    cachedDb = db;
    await ensureCoreMongoIndexes(db);
    console.log('MongoDB connected successfully to sunday_school');
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
  if (client) {
    await client.close();
    client = null;
    clientPromise = null;
    cachedDb = null;
  }
}