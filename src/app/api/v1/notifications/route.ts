// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  countUnread,
} from "@/lib/notifications";
import { requireAuth, requireSuperAdmin, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 30, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const role = String(token.role || "");
    const userId = String(token.id || "");
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const notifs = await getNotifications(role, userId, limit);
    const unreadCount = await countUnread(role, userId);

    return NextResponse.json(
      { notifications: notifs, unreadCount },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  const rl = await enforceRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rl) return rl;

  try {
    const body = await req.json();
    const { type, title, message, targetRoles, targetUserId, href } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 },
      );
    }

    const notifId = await createNotification({
      type,
      title,
      message,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      targetUserId,
      href,
    });

    return NextResponse.json({ id: notifId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { token, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { notifId, markAll } = body;

    if (markAll) {
      const count = await markAllAsRead(
        String(token.role || ""),
        String(token.id || ""),
      );
      return NextResponse.json({ marked: count }, { status: 200 });
    }

    if (!notifId) {
      return NextResponse.json({ error: "notifId is required" }, { status: 400 });
    }

    await markAsRead(notifId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
