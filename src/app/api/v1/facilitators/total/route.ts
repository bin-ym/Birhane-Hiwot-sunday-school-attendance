// src/app/api/facilitators/total/route.ts
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sanitizeError } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 30, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const db = await getDb();
    const count = await db
      .collection('users')
      .countDocuments({ role: { $in: ['Attendance Facilitator', 'Education Facilitator'] } });
    return NextResponse.json({ total: count }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}