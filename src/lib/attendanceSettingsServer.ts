// src/lib/attendanceSettingsServer.ts
// Server-side attendance calendar settings persistence in MongoDB.
// MUST NOT be imported into client components.

import { getDb } from "@/lib/mongodb";
import {
  AttendanceCalendarMode,
  DEFAULT_ATTENDANCE_CALENDAR_MODE,
} from "@/lib/constants";
import { logAudit } from "@/lib/auditLog";

export interface AttendanceSettingsDoc {
  _id: "attendance_calendar_rules";
  mode: AttendanceCalendarMode;
  updatedAt: Date;
  updatedBy: string;
}

let cachedSettings: {
  mode: AttendanceCalendarMode;
  updatedAt?: Date;
  updatedBy?: string;
} | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000;

export function invalidateAttendanceCalendarSettingsCache(): void {
  cachedSettings = null;
  lastCacheTime = 0;
}

/**
 * Retrieve the current attendance calendar mode from database settings.
 * Defaults to "sundays_only" if not configured.
 */
export async function getAttendanceCalendarSettings(): Promise<{
  mode: AttendanceCalendarMode;
  updatedAt?: Date;
  updatedBy?: string;
}> {
  const now = Date.now();
  if (cachedSettings && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    if (!process.env.MONGODB_URI) {
      return { mode: DEFAULT_ATTENDANCE_CALENDAR_MODE };
    }

    const db = await getDb();
    const doc = await db
      .collection("system_settings")
      .findOne({ _id: "attendance_calendar_rules" as any });

    if (doc && (doc.mode === "sundays_only" || doc.mode === "all_days")) {
      cachedSettings = {
        mode: doc.mode as AttendanceCalendarMode,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
      };
    } else {
      cachedSettings = { mode: DEFAULT_ATTENDANCE_CALENDAR_MODE };
    }

    lastCacheTime = now;
    return cachedSettings;
  } catch {
    return cachedSettings || { mode: DEFAULT_ATTENDANCE_CALENDAR_MODE };
  }
}

/**
 * Persist the updated attendance calendar mode into system_settings collection.
 * Restricted to Super Admin.
 */
export async function saveAttendanceCalendarSettings({
  mode,
  updatedBy,
  userId,
  userRole,
}: {
  mode: AttendanceCalendarMode;
  updatedBy: string;
  userId?: string;
  userRole?: string;
}): Promise<{ success: boolean; mode: AttendanceCalendarMode }> {
  if (mode !== "sundays_only" && mode !== "all_days") {
    throw new Error(`Invalid attendance calendar mode: ${mode}`);
  }

  const db = await getDb();
  const collection = db.collection("system_settings");

  const previousDoc = await collection.findOne({
    _id: "attendance_calendar_rules" as any,
  });

  const now = new Date();

  await collection.updateOne(
    { _id: "attendance_calendar_rules" as any },
    {
      $set: {
        mode,
        updatedAt: now,
        updatedBy,
      },
    },
    { upsert: true },
  );

  invalidateAttendanceCalendarSettingsCache();

  try {
    await logAudit({
      action: "update",
      collection: "system_settings",
      documentId: "attendance_calendar_rules",
      userId: userId || updatedBy,
      userEmail: updatedBy,
      userRole: userRole || "Super Admin",
      summary: `Updated Attendance Calendar Mode from "${previousDoc?.mode || DEFAULT_ATTENDANCE_CALENDAR_MODE}" to "${mode}"`,
      changedFields: ["mode"],
    });
  } catch (auditErr) {
    console.warn("Audit logging for attendance settings failed:", auditErr);
  }

  return { success: true, mode };
}
