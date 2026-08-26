// src/app/api/health/route.ts
// System health endpoint — reports DB status, collection sizes, and basic metrics.
// Super Admin only.
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();

    // Collection sizes
    const collections = [
      "students",
      "attendance",
      "users",
      "payment_status",
      "audit_logs",
      "notifications",
      "student_requests",
      "student_results",
      "subjects",
      "category_periods",
    ];

    const collectionCounts: Record<string, number> = {};
    for (const name of collections) {
      try {
        collectionCounts[name] = await db.collection(name).countDocuments();
      } catch {
        collectionCounts[name] = -1; // error reading
      }
    }

    // Database stats
    let dbStats: Record<string, unknown> = {};
    try {
      const stats = await db.command({ dbStats: 1 });
      dbStats = {
        sizeMB: Math.round((stats.dataSize || 0) / 1024 / 1024 * 100) / 100,
        storageMB: Math.round((stats.storageSize || 0) / 1024 / 1024 * 100) / 100,
        indexSizeMB: Math.round((stats.indexSize || 0) / 1024 / 1024 * 100) / 100,
        collections: stats.collections || 0,
        objects: stats.objects || 0,
      };
    } catch {
      // dbStats may not be available on all providers
    }

    // Uptime
    const uptimeMs = Date.now() - startTime;
    const uptimeHours = Math.round(uptimeMs / 1000 / 60 / 60 * 10) / 10;

    // Recent audit activity
    let recentActions = 0;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      recentActions = await db
        .collection("audit_logs")
        .countDocuments({ timestamp: { $gte: oneDayAgo } });
    } catch {
      // audit_logs may not exist yet
    }

    // Recent notifications
    let unreadNotifications = 0;
    try {
      unreadNotifications = await db
        .collection("notifications")
        .countDocuments({ read: false });
    } catch {
      // notifications may not exist yet
    }

    return NextResponse.json(
      {
        status: "healthy",
        uptime: `${uptimeHours}h`,
        database: {
          connected: true,
          name: db.databaseName,
          ...dbStats,
        },
        collections: collectionCounts,
        activity: {
          recentActions24h: recentActions,
          unreadNotifications,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", error: sanitizeError(err) },
      { status: 500 },
    );
  }
}
