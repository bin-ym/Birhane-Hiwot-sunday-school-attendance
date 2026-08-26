// src/lib/notifications.ts
// Lightweight notification system — writes to the `notifications` collection.
// Supports role-based targeting and read/unread state.

import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

export type NotificationType =
  | "attendance_submitted"
  | "student_created"
  | "student_request"
  | "payment_reminder"
  | "registration_closed"
  | "system"
  | "info";

export interface AppNotification {
  _id?: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  /** Target role(s). Empty = all authenticated users. */
  targetRoles: string[];
  /** Target user ID. Empty = role-based broadcast. */
  targetUserId?: string;
  /** Whether the target user has read it. */
  read: boolean;
  /** Optional link to navigate to on click. */
  href?: string;
  createdAt: Date;
}

/**
 * Create a notification and optionally broadcast to a role.
 */
export async function createNotification(
  notif: Omit<AppNotification, "_id" | "read" | "createdAt">,
): Promise<string | null> {
  try {
    const db = await getDb();
    const result = await db.collection("notifications").insertOne({
      ...notif,
      read: false,
      createdAt: new Date(),
    });
    return result.insertedId.toString();
  } catch {
    return null;
  }
}

/**
 * Get notifications for a user (by role and/or userId).
 */
export async function getNotifications(
  userRole: string,
  userId?: string,
  limit = 20,
): Promise<AppNotification[]> {
  const db = await getDb();
  const orClauses: Record<string, unknown>[] = [
    { targetRoles: { $size: 0 } }, // broadcast to all
    { targetRoles: userRole },
  ];

  // Also include personal notifications
  if (userId) {
    orClauses.push({ targetUserId: userId });
  }
  const query: Record<string, unknown> = { $or: orClauses };

  const notifs = await db
    .collection<AppNotification>("notifications")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return notifs;
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notifId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db
      .collection("notifications")
      .updateOne({ _id: new ObjectId(notifId) }, { $set: { read: true } });
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(
  userRole: string,
  userId?: string,
): Promise<number> {
  try {
    const db = await getDb();
    const orClauses: Record<string, unknown>[] = [
      { targetRoles: { $size: 0 } },
      { targetRoles: userRole },
    ];
    if (userId) orClauses.push({ targetUserId: userId });
    const query: Record<string, unknown> = { read: false, $or: orClauses };

    const result = await db
      .collection("notifications")
      .updateMany(query, { $set: { read: true } });
    return result.modifiedCount;
  } catch {
    return 0;
  }
}

/**
 * Count unread notifications for a user.
 */
export async function countUnread(
  userRole: string,
  userId?: string,
): Promise<number> {
  try {
    const db = await getDb();
    const orClauses: Record<string, unknown>[] = [
      { targetRoles: { $size: 0 } },
      { targetRoles: userRole },
    ];
    if (userId) orClauses.push({ targetUserId: userId });
    const query: Record<string, unknown> = { read: false, $or: orClauses };

    return await db.collection("notifications").countDocuments(query);
  } catch {
    return 0;
  }
}
