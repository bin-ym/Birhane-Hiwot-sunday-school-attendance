// src/app/api/audit-logs/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 30, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const collection = searchParams.get("collection");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");

    const query: Record<string, unknown> = {};
    if (collection) query.collection = collection;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await db
      .collection("audit_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const serialized = logs.map((log) => ({
      ...log,
      _id: log._id.toString(),
      timestamp: log.timestamp?.toISOString?.() || log.timestamp,
    }));

    return NextResponse.json(serialized, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
